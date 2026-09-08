import { esc, page } from './html.ts';
import { config } from '../config.ts';

type Segment = {
  kind: string; carrier: string | null; carrierName: string | null; number: string | null;
  bookingRef: string | null; fromCode: string | null; fromCity: string | null;
  toCode: string | null; toCity: string | null; departLocal: string | null; departTz: string | null;
  arriveLocal: string | null; arriveTz: string | null;
  cabin: string | null; seat: string | null; passengers: string | null;
};

type Trip = {
  slug: string; privateKey: string | null; title: string | null;
  startDate: string | null; endDate: string | null; needsReview: boolean;
};

/**
 * private: everything, for the person who forwarded the ticket.
 * public:  the same trip with the details that name a person removed.
 */
export type View = 'private' | 'public';
export type IcsMode = 'trip' | 'flights';
export type IcsFile = { name: string; data: string };

/** One list, so hiding one more field later is a one line change. */
const HIDDEN_IN_PUBLIC = ['passengers', 'bookingRef', 'seat'] as const;

const time = (v: string | null) => (v ? v.slice(11, 16) : '--:--');
const dayLabel = (v: string | null) =>
  v ? new Date(`${v.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';

/** A local time plus its zone, as a UTC instant. Needed to time a flight. */
function instant(local: string | null, tz: string | null): number | null {
  if (!local) return null;
  const naive = Date.parse(`${local.length === 16 ? local : local.slice(0, 16)}:00Z`);
  if (Number.isNaN(naive)) return null;
  if (!tz) return naive;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(naive));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const shifted = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return naive - (shifted - naive);
  } catch {
    return naive;                                  // unknown zone: treat as floating
  }
}

function humanDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Nights between an arrival and the next departure, by calendar date. */
function nightsBetween(arrive: string, depart: string): number {
  const a = Date.parse(`${arrive.slice(0, 10)}T00:00:00Z`);
  const d = Date.parse(`${depart.slice(0, 10)}T00:00:00Z`);
  return Math.max(0, Math.round((d - a) / 86_400_000));
}

function stopHtml(cls: string, when: string, where: string): string {
  return `<div class="stop ${cls}"><div class="when nums">${when}</div><div class="where">${where}</div></div>`;
}

/**
 * The gap between two legs. The rail goes dotted through it, because the
 * timeline stops being to scale here: an hour and a week look the same.
 */
function stayHtml(prev: Segment, next: Segment): string {
  if (!prev.arriveLocal || !next.departLocal) return '';
  const from = instant(prev.arriveLocal, prev.arriveTz);
  const to = instant(next.departLocal, next.departTz);
  if (from === null || to === null || to <= from) return '';
  const gap = to - from;
  if (gap < 45 * 60_000) return '';               // too short to be worth a line

  const place = prev.toCity ?? prev.toCode ?? '';
  const nights = nightsBetween(prev.arriveLocal, next.departLocal);
  const isStay = nights >= 1;
  const label = isStay
    ? `${nights} night${nights === 1 ? '' : 's'} in ${place}`
    : `${humanDuration(gap)} in ${place}`;

  return `<div class="stay">
  <div class="k">${isStay ? 'Stay' : 'Connection'}</div>
  <div class="v">${esc(label)}</div>
</div>`;
}

function legHtml(s: Segment, view: View, isFirstOfDay: boolean): string {
  const show = (field: (typeof HIDDEN_IN_PUBLIC)[number]) => view === 'private' || !HIDDEN_IN_PUBLIC.includes(field);
  const flight = [s.carrier, s.number].filter(Boolean).join(' ');
  const pax = (() => { try { return JSON.parse(s.passengers ?? '[]') as string[]; } catch { return []; } })();

  const departWhen = isFirstOfDay && s.departLocal
    ? `${dayLabel(s.departLocal)} &middot; ${time(s.departLocal)}`
    : time(s.departLocal);

  const departExtra = [
    show('seat') && s.seat ? `seat ${esc(s.seat)}` : '',
    show('bookingRef') && s.bookingRef ? `ref ${esc(s.bookingRef)}` : '',
    show('passengers') && pax.length ? esc(pax.join(', ')) : '',
  ].filter(Boolean).join(' &middot; ');

  const from = instant(s.departLocal, s.departTz);
  const to = instant(s.arriveLocal, s.arriveTz);
  const duration = from !== null && to !== null && to > from ? humanDuration(to - from) : null;

  const arriveSameDay = s.departLocal && s.arriveLocal && s.departLocal.slice(0, 10) === s.arriveLocal.slice(0, 10);

  return [
    stopHtml('', departWhen, `${esc(s.fromCity ?? '')} <b>${esc(s.fromCode ?? '')}</b>${departExtra ? ` &middot; ${departExtra}` : ''}`),
    `<div class="hop">${duration ? `<b>${duration}</b> &middot; ` : ''}${esc(flight)}${s.carrierName ? ` &middot; ${esc(s.carrierName)}` : ''}</div>`,
    stopHtml('arrive', arriveSameDay ? time(s.arriveLocal) : `${dayLabel(s.arriveLocal)} &middot; ${time(s.arriveLocal)}`,
      `${esc(s.toCity ?? '')} <b>${esc(s.toCode ?? '')}</b>`),
  ].join('\n');
}

function calendarHtml(base: string): string {
  const cal = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/></svg>`;
  return `<div class="split">
  <a class="main" href="${base}">${cal}Add to calendar</a>
  <details>
    <summary class="more" aria-label="Other calendar options" role="button">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6.5 8 10.5 12 6.5"/></svg>
    </summary>
    <div class="menu" role="menu">
      <a role="menuitem" href="${base}">One event for the whole trip<span class="note">Departure to final arrival</span></a>
      <a role="menuitem" href="${base}?mode=flights">One event per flight<span class="note">A zip with one file per flight</span></a>
    </div>
  </details>
</div>`;
}

function shareHtml(trip: Trip): string {
  const url = `${config.publicBaseUrl}/${trip.slug}`;
  return `<div class="share">
  <p class="share-label">Share this trip</p>
  <div class="share-row">
    <input class="share-url" value="${esc(url)}" readonly onclick="this.select()">
    <button class="btn" onclick="navigator.clipboard.writeText('${esc(url)}');this.textContent='Copied'">Copy</button>
  </div>
  <p class="share-note">The shared page hides passenger names, the booking reference and seat numbers.
    <a href="/${esc(trip.slug)}">See what others get</a>.</p>
</div>`;
}

const MENU_JS = `<script>
document.addEventListener('click', (e) => {
  for (const d of document.querySelectorAll('details[open]')) {
    if (!d.contains(e.target)) d.open = false;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') for (const d of document.querySelectorAll('details[open]')) d.open = false;
});
</script>`;

export function tripPage(trip: Trip, segs: Segment[], view: View): string {
  const range = trip.startDate
    ? `${dayLabel(trip.startDate)}${trip.endDate && trip.endDate !== trip.startDate ? ` &ndash; ${dayLabel(trip.endDate)}` : ''}`
    : '';
  const flights = segs.map((s) => [s.carrier, s.number].filter(Boolean).join(' ')).filter(Boolean);
  const icsBase = view === 'private' && trip.privateKey ? `/t/${esc(trip.privateKey)}.ics` : `/${esc(trip.slug)}.ics`;

  const rail: string[] = [];
  segs.forEach((s, i) => {
    if (i > 0) rail.push(stayHtml(segs[i - 1], s));
    const newDay = i === 0 || segs[i - 1].arriveLocal?.slice(0, 10) !== s.departLocal?.slice(0, 10);
    rail.push(legHtml(s, view, newDay));
  });

  const body = `<div class="card">
${view === 'private' && trip.needsReview ? '<div class="flag">Some details were unclear when this was read. Check the times against your ticket.</div>' : ''}
<h1>${esc(trip.title ?? 'Trip')}</h1>
<p class="sub">${range}${flights.length ? ` &middot; ${flights.map((f) => `<b>${esc(f)}</b>`).join(', ')}` : ''}</p>

<div class="rail">
${rail.filter(Boolean).join('\n')}
</div>

<div class="actions">
  <span class="id">fly &middot; ${esc(trip.slug)}</span>
  ${calendarHtml(icsBase)}
</div>
${view === 'private' ? shareHtml(trip) : ''}
</div>
${MENU_JS}`;

  return page(trip.title ?? `Trip ${trip.slug}`, body);
}

const slugify = (v: string) => v.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * One calendar file per flight, for the zip. Separate files let a person add
 * the outbound to one calendar and the return to another, or drop one leg.
 */
export function flightIcsFiles(trip: Trip, segs: Segment[], view: View): IcsFile[] {
  const dated = segs.filter((s) => s.departLocal);
  return dated.map((s, i) => {
    const flight = [s.carrier, s.number].filter(Boolean).join(' ') || `leg-${i + 1}`;
    const name = `${String(i + 1).padStart(2, '0')}-${slugify(flight)}-${s.fromCode ?? ''}-${s.toCode ?? ''}.ics`;
    // The index keeps every UID distinct, so a calendar treats the files
    // as four separate events rather than four copies of one.
    return { name, data: tripIcs(trip, [s], view, 'flights', i) };
  });
}

/**
 * Times stay floating: they are local to each airport, which is how a ticket
 * reads and how every calendar shows a flight you typed in by hand.
 */
export function tripIcs(trip: Trip, segs: Segment[], view: View, mode: IcsMode = 'trip', uidFrom = 0): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const fmt = (v: string | null) => {
    if (!v) return '';
    const t = v.replace(/[-:]/g, '').slice(0, 15);
    return t.length === 13 ? `${t}00` : t;
  };
  const fold = (s: string) => s.replace(/\r?\n/g, '\\n');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//fly//EN', 'CALSCALE:GREGORIAN'];
  const dated = segs.filter((s) => s.departLocal);

  if (mode === 'trip' && dated.length) {
    const first = dated[0];
    const last = dated[dated.length - 1];
    const detail = dated.map((s) =>
      `${[s.carrier, s.number].filter(Boolean).join(' ')} ${s.fromCode ?? ''} ${time(s.departLocal)} to ${s.toCode ?? ''} ${time(s.arriveLocal)}`,
    );
    if (view === 'private') {
      const refs = [...new Set(dated.map((s) => s.bookingRef).filter(Boolean))];
      if (refs.length) detail.push(`Ref ${refs.join(', ')}`);
    }
    lines.push(
      'BEGIN:VEVENT',
      `UID:${trip.slug}-trip@fly.diz.lt`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${fmt(first.departLocal)}`,
      `DTEND:${fmt(last.arriveLocal ?? last.departLocal)}`,
      `SUMMARY:${trip.title ?? 'Trip'}`,
      `DESCRIPTION:${fold(detail.join('\n'))}`,
      `URL:${config.publicBaseUrl}/${trip.slug}`,
      'END:VEVENT',
    );
  } else {
    dated.forEach((s, i) => {
      const description = view === 'private'
        ? [s.bookingRef && `Ref ${s.bookingRef}`, s.seat && `Seat ${s.seat}`].filter(Boolean).join(', ')
        : '';
      lines.push(
        'BEGIN:VEVENT',
        `UID:${trip.slug}-${uidFrom + i}@fly.diz.lt`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${fmt(s.departLocal)}`,
        s.arriveLocal ? `DTEND:${fmt(s.arriveLocal)}` : 'DURATION:PT2H',
        `SUMMARY:${[s.carrier, s.number].filter(Boolean).join(' ')} ${s.fromCode ?? ''} to ${s.toCode ?? ''}`,
        ...(description ? [`DESCRIPTION:${description}`] : []),
        `URL:${config.publicBaseUrl}/${trip.slug}`,
        'END:VEVENT',
      );
    });
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
