import { esc, page, copyable, type ShareMeta } from './html.ts';
import { config } from '../config.ts';
import { kindIcon, kindLabel, variantClass, KIND_ICON, KIND_NAME } from './kinds.ts';

type Segment = {
  kind: string; carrier: string | null; carrierName: string | null; number: string | null;
  bookingRef: string | null; address: string | null; fromCode: string | null; fromCity: string | null;
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

/**
 * One list, so hiding one more field later is a one line change. The public
 * page never renders these: they are dropped server side, so they are not in
 * the HTML either, not merely hidden with CSS.
 */
const HIDDEN_IN_PUBLIC = ['passengers', 'bookingRef', 'seat', 'address', 'placeName'] as const;

/** Things that carry you somewhere. They become stops on the rail. */
const MOVE_KINDS = new Set(['flight', 'train', 'bus', 'ferry']);
/** Things that fill the time between. They sit in the gap. */
const SPAN_KINDS = new Set(['hotel', 'car']);
const isMove = (s: Segment) => MOVE_KINDS.has(s.kind);
const isSpan = (s: Segment) => SPAN_KINDS.has(s.kind);

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

/** When a segment starts and ends. A ferry ticket often has no arrival time,
 *  so its end falls back to the departure rather than dropping the gap after it. */
const startOf = (s: Segment) => instant(s.departLocal, s.departTz);
const endOf = (s: Segment) => instant(s.arriveLocal, s.arriveTz) ?? startOf(s);

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

/** "30 Sept, Wed", for the kind styles, where the date follows the place. */
const dayAfterPlace = (v: string) => {
  const d = new Date(`${v.slice(0, 10)}T00:00:00Z`);
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  return `${day}, ${weekday}`;
};

/**
 * A stop in the kind styles: "Shkodër • 30 Sept, Wed · 07:00" on one line, as
 * big as each other, with the ref and the names in a small line under it.
 * The date shows only when it changes; the time always does.
 */
function placeStopHtml(cls: string, city: string | null, code: string | null, dateOf: string | null, at: string | null, extra: string): string {
  const place = `${esc(city ?? '')}${code ? ` <span class="code">${esc(code)}</span>` : ''}`;
  const when = `${dateOf ? `${dayAfterPlace(dateOf)} &middot; ` : ''}${time(at)}`;
  return `<div class="stop ${cls}"><div class="when nums">${place ? `${place} <span class="sep">&bull;</span> ` : ''}${when}</div>${extra ? `<div class="where">${extra}</div>` : ''}</div>`;
}

function stopHtml(cls: string, when: string, where: string): string {
  return `<div class="stop ${cls}"><div class="when nums">${when}</div><div class="where">${where}</div></div>`;
}

const KIND_LABEL: Record<string, string> = { hotel: 'Hotel', car: 'Car hire' };

/**
 * A hotel or a car inside a gap. The public page gets the fact that something
 * is booked and when; the name, the address and the confirmation stay on the
 * owner page, where they are what you actually need at the desk.
 */
function spanHtml(s: Segment, view: View, kinds = false): string {
  // The kind styles call a hotel a Stay: an Airbnb is not a hotel.
  const kind = (kinds ? KIND_NAME[s.kind] : KIND_LABEL[s.kind]) ?? 'Booking';
  const when = s.departLocal && s.arriveLocal
    ? `${dayLabel(s.departLocal)} ${time(s.departLocal)} to ${dayLabel(s.arriveLocal)} ${time(s.arriveLocal)}`
    : s.departLocal ? `${dayLabel(s.departLocal)} ${time(s.departLocal)}` : '';
  if (view === 'public') {
    return `<div class="span"${kinds ? ` data-kind="${esc(s.kind)}"` : ''}><span class="tag">${kinds ? KIND_ICON[s.kind] ?? '' : ''}${esc(kind)} booked</span>${when ? `<div class="span-when nums">${esc(when)}</div>` : ''}</div>`;
  }

  const name = s.carrierName ?? s.carrier ?? kind;
  const rest = [
    s.address ? esc(s.address) : '',
    s.bookingRef ? `ref ${copyable(s.bookingRef)}` : '',
  ].filter(Boolean).join(' &middot; ');

  return `<div class="span"${kinds ? ` data-kind="${esc(s.kind)}"` : ''}>
  <div class="span-top"><span class="tag">${kinds ? KIND_ICON[s.kind] ?? '' : ''}${esc(kind)}</span> <b>${esc(name)}</b></div>
  ${when ? `<div class="span-when nums">${esc(when)}</div>` : ''}
  ${rest ? `<div class="span-rest">${rest}</div>` : ''}
</div>`;
}

/**
 * The gap between two legs. The rail goes dotted through it, because the
 * timeline stops being to scale here: an hour and a week look the same.
 * It says how long and where: the town of the booked stay, else the arrival
 * town. A town is not private; the hotel's name and street are.
 */
function stayHtml(prev: Segment, next: Segment, spans: Segment[], view: View, kinds = false): string {
  const arrived = prev.arriveLocal ?? prev.departLocal;
  if (!arrived || !next.departLocal) return '';
  const from = endOf(prev);
  const to = startOf(next);
  if (from === null || to === null || to <= from) return '';
  const gap = to - from;
  if (gap < 45 * 60_000 && !spans.length) return '';   // too short to be worth a line

  const nights = nightsBetween(arrived, next.departLocal);
  const isStay = nights >= 1;
  const airport = prev.toCode ?? '';
  const towns = [...new Set(spans.filter((sp) => sp.kind === 'hotel').map((sp) => sp.toCity ?? sp.fromCity).filter(Boolean))];
  const place = towns.length ? towns.join(' and ') : prev.toCity;
  const label = isStay
    ? `${nights} night${nights === 1 ? '' : 's'}${place ? ` in ${place}` : ''}`
    : `${humanDuration(gap)}${airport ? ` at ${airport}` : ''}`;

  // The stay takes the kind of what fills it: a hotel over a car.
  const filler = spans.some((sp) => sp.kind === 'hotel') ? 'hotel' : spans[0]?.kind;
  const mark = kinds && filler ? ` data-kind="${esc(filler)}"` : '';
  return `<div class="stay"${mark}>
  ${kinds && isStay ? kindIcon(filler ?? 'hotel') : ''}
  ${kinds && mark ? '' : `<div class="k">${isStay ? 'Stay' : 'Connection'}</div>`}
  <div class="v">${esc(label)}</div>
  ${spans.map((s) => spanHtml(s, view, kinds)).join('')}
</div>`;
}

function legHtml(s: Segment, view: View, isFirstOfDay: boolean, kinds = false): string {
  const show = (field: (typeof HIDDEN_IN_PUBLIC)[number]) => view === 'private' || !HIDDEN_IN_PUBLIC.includes(field);
  const flight = [s.carrier, s.number].filter(Boolean).join(' ');
  const pax = (() => { try { return JSON.parse(s.passengers ?? '[]') as string[]; } catch { return []; } })();

  const departWhen = isFirstOfDay && s.departLocal
    ? `${dayLabel(s.departLocal)} &middot; ${time(s.departLocal)}`
    : time(s.departLocal);

  const departExtra = [
    show('seat') && s.seat ? `seat ${esc(s.seat)}` : '',
    show('bookingRef') && s.bookingRef ? `ref ${copyable(s.bookingRef)}` : '',
    show('passengers') && pax.length ? esc(pax.join(', ')) : '',
  ].filter(Boolean).join(' &middot; ');

  const from = instant(s.departLocal, s.departTz);
  const to = instant(s.arriveLocal, s.arriveTz);
  const duration = from !== null && to !== null && to > from ? humanDuration(to - from) : null;

  const arriveSameDay = s.departLocal && s.arriveLocal && s.departLocal.slice(0, 10) === s.arriveLocal.slice(0, 10);

  const hopText = [duration ? `<b>${duration}</b>` : '', flight ? copyable(flight) : '', s.carrierName ? esc(s.carrierName) : ''].filter(Boolean).join(' &middot; ');
  const parts = kinds
    ? [
      placeStopHtml('', s.fromCity, s.fromCode, isFirstOfDay ? s.departLocal : null, s.departLocal, departExtra),
      // The chip and the text are two flex items, so the chip sits on the text's centre line.
      `<div class="hop">${kindIcon(s.kind)}${kindLabel(s.kind)}<span class="hop-text">${hopText}</span></div>`,
      placeStopHtml('arrive', s.toCity, s.toCode, arriveSameDay ? null : s.arriveLocal, s.arriveLocal, ''),
    ]
    : [
      stopHtml('', departWhen, `${esc(s.fromCity ?? '')} <b>${esc(s.fromCode ?? '')}</b>${departExtra ? ` &middot; ${departExtra}` : ''}`),
      `<div class="hop">${hopText}</div>`,
      stopHtml('arrive', !s.arriveLocal || arriveSameDay ? time(s.arriveLocal) : `${dayLabel(s.arriveLocal)} &middot; ${time(s.arriveLocal)}`,
        `${esc(s.toCity ?? '')} <b>${esc(s.toCode ?? '')}</b>`),
    ];
  // Wrapped, so a variant can draw the whole leg as one thing.
  return kinds
    ? `<div class="leg" data-kind="${esc(s.kind)}">${kindIcon(s.kind)}\n${parts.join('\n')}\n</div>`
    : parts.join('\n');
}

function calendarHtml(base: string, perItem: string): string {
  const cal = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/></svg>`;
  return `<div class="split">
  <a class="main" href="${base}">${cal}Add to calendar</a>
  <details>
    <summary class="more" aria-label="Other calendar options" role="button">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6.5 8 10.5 12 6.5"/></svg>
    </summary>
    <div class="menu" role="menu">
      <a role="menuitem" href="${base}">One event for the whole trip<span class="note">Departure to final arrival</span></a>
      <a role="menuitem" href="${base}${base.includes('?') ? '&' : '?'}mode=flights">One event per ${perItem}<span class="note">A zip with one file per ${perItem}</span></a>
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

const DEFAULT_VARIANT = 6;

export type CardOptions = {
  /** Where the calendar links point. Defaults to this trip's own files. */
  icsBase?: string;
  /** The share box and the trip id belong on a real page, not in a demo. */
  chrome?: boolean;
  /** Which of the /variants styles marks each kind of booking (kinds.ts). */
  variant?: number;
};

/** The card itself, so the landing page can show a real one, not a picture. */
export function tripCard(trip: Trip, segs: Segment[], view: View, options: CardOptions = {}): string {
  // Style 6 is the one chosen: colour per kind, every kind in a chip.
  const { chrome = true, variant = DEFAULT_VARIANT } = options;
  const kinds = !!variant;
  const range = trip.startDate
    ? `${dayLabel(trip.startDate)}${trip.endDate && trip.endDate !== trip.startDate ? ` &ndash; ${dayLabel(trip.endDate)}` : ''}`
    : '';
  // Only the things that move: a rental company in this line leaked the
  // booking to the public page.
  const flights = segs.filter(isMove).map((s) => [s.carrier, s.number].filter(Boolean).join(' ')).filter(Boolean);
  const icsBase = options.icsBase
    ?? (view === 'private' && trip.privateKey ? `/t/${esc(trip.privateKey)}.ics` : `/${esc(trip.slug)}.ics`);
  const perItem = segs.every(isMove) && segs.every((s) => s.kind === 'flight') ? 'flight' : 'booking';

  // By the instant, not the stored string: a local time in another zone can
  // sort before a leg that actually leaves earlier.
  const moves = segs.filter(isMove).sort((a, b) => (startOf(a) ?? 0) - (startOf(b) ?? 0));
  const spans = segs.filter(isSpan);

  /**
   * A hotel or car belongs to the gap it overlaps most. Matching on the check
   * in alone, with slack either side, put a Valbonë hotel that starts after the
   * morning bus into the Shkodër night before it.
   */
  const gaps = moves.slice(1).map((next, i) => ({ from: endOf(moves[i]), to: startOf(next), spans: [] as Segment[] }));
  const loose: Segment[] = [];
  for (const sp of spans) {
    const start = startOf(sp);
    const end = endOf(sp);
    let best: (typeof gaps)[number] | null = null;
    let bestScore = 0;
    for (const g of gaps) {
      if (start === null || g.from === null || g.to === null) continue;
      // A booking with no end is a point: it counts when it falls inside the gap.
      const score = end !== null && end > start
        ? Math.min(end, g.to) - Math.max(start, g.from)
        : start >= g.from && start <= g.to ? 1 : 0;
      if (score > bestScore) { best = g; bestScore = score; }
    }
    (best ? best.spans : loose).push(sp);
  }

  const rail: string[] = [];
  moves.forEach((s, i) => {
    if (i > 0) rail.push(stayHtml(moves[i - 1], s, gaps[i - 1].spans, view, kinds));
    const newDay = i === 0 || moves[i - 1].arriveLocal?.slice(0, 10) !== s.departLocal?.slice(0, 10);
    rail.push(legHtml(s, view, newDay, kinds));
  });

  // A hotel with no flight around it, or one booked outside every gap, still
  // belongs on the page rather than being dropped.
  if (loose.length) {
    rail.push(`<div class="stay">
  <div class="k">Booked</div>
  ${loose.map((sp) => spanHtml(sp, view, kinds)).join('')}
</div>`);
  }

  return `<div class="card${variant ? ` ${variantClass(variant)}` : ''}">
${view === 'private' && trip.needsReview ? '<div class="flag">Some details were unclear when this was read. Check the times against your ticket.</div>' : ''}
<h1>${esc(trip.title ?? 'Trip')}</h1>
<p class="sub">${range}${flights.length ? ` &middot; ${flights.map((f) => `<b>${esc(f)}</b>`).join(', ')}` : ''}</p>

<div class="rail">
${rail.filter(Boolean).join('\n')}
</div>

<div class="actions">
  ${calendarHtml(icsBase, perItem)}
</div>
${chrome && view === 'private' ? shareHtml(trip) : ''}
</div>`;
}

const COUNT_WORD: Record<string, [string, string]> = {
  flight: ['flight', 'flights'], train: ['train', 'trains'], bus: ['bus', 'buses'],
  ferry: ['ferry', 'ferries'], hotel: ['stay', 'stays'], car: ['car hire', 'car hires'],
};

/**
 * The link preview for one trip. Built only from what the public page shows,
 * dates, places and counts, so pasting the owner link into a chat leaks no
 * name, reference or hotel either.
 */
function shareMeta(trip: Trip, segs: Segment[]): ShareMeta {
  const range = trip.startDate
    ? `${dayLabel(trip.startDate)}${trip.endDate && trip.endDate !== trip.startDate ? ` – ${dayLabel(trip.endDate)}` : ''}`
    : '';
  const places: string[] = [];
  for (const s of segs.filter(isMove)) {
    for (const p of [s.fromCity ?? s.fromCode, s.toCity ?? s.toCode]) {
      if (p && places[places.length - 1] !== p) places.push(p);
    }
  }
  const counts = Object.entries(COUNT_WORD)
    .map(([kind, [one, many]]) => {
      const n = segs.filter((s) => s.kind === kind).length;
      return n ? `${n} ${n === 1 ? one : many}` : '';
    })
    .filter(Boolean);
  const description = [range, places.join(' → '), counts.join(', ')].filter(Boolean).join(' · ');
  return {
    title: trip.title ?? 'A trip',
    description: description || 'A trip on fly',
    url: `${config.publicBaseUrl}/${trip.slug}`,
  };
}

export function tripPage(trip: Trip, segs: Segment[], view: View): string {
  return page(trip.title ?? `Trip ${trip.slug}`, `${tripCard(trip, segs, view)}${MENU_JS}`, { share: shareMeta(trip, segs) });
}

const slugify = (v: string) => v.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * One calendar file per flight, for the zip. Separate files let a person add
 * the outbound to one calendar and the return to another, or drop one leg.
 */
export function flightIcsFiles(trip: Trip, segs: Segment[], view: View): IcsFile[] {
  const dated = segs.filter((s) => s.departLocal);
  return dated.map((s, i) => {
    // A rental company also fills the carrier field, so the public file name
    // has to ignore every name on a booking, not only carrierName.
    const named = isMove(s) || view === 'private';
    const flight = named
      ? [s.carrier, s.number].filter(Boolean).join(' ') || s.carrierName || s.kind
      : s.kind;
    const where = isMove(s) ? `-${s.fromCode ?? ''}-${s.toCode ?? ''}` : `-${s.fromCode ?? ''}`;
    const name = `${String(i + 1).padStart(2, '0')}-${slugify(flight)}${slugify(where) ? `-${slugify(where)}` : ''}.ics`;
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
    const detail = dated.map((s) => {
      if (isMove(s)) {
        return `${[s.carrier, s.number].filter(Boolean).join(' ')} ${s.fromCode ?? ''} ${time(s.departLocal)} to ${s.toCode ?? ''} ${time(s.arriveLocal)}`.trim();
      }
      const kind = KIND_LABEL[s.kind] ?? 'Booking';
      // A hotel or a car names itself only on the owner's file.
      if (view === 'public') return `${kind} booked`;
      return `${kind}: ${s.carrierName ?? ''}, ${dayLabel(s.departLocal)} ${time(s.departLocal)} to ${dayLabel(s.arriveLocal)} ${time(s.arriveLocal)}`;
    });
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
        ? [s.bookingRef && `Ref ${s.bookingRef}`, s.seat && `Seat ${s.seat}`, s.address].filter(Boolean).join(', ')
        : '';
      lines.push(
        'BEGIN:VEVENT',
        `UID:${trip.slug}-${uidFrom + i}@fly.diz.lt`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${fmt(s.departLocal)}`,
        s.arriveLocal ? `DTEND:${fmt(s.arriveLocal)}` : 'DURATION:PT2H',
        `SUMMARY:${isMove(s)
          ? `${[s.carrier, s.number].filter(Boolean).join(' ')} ${s.fromCode ?? ''} to ${s.toCode ?? ''}`
          : view === 'private'
            ? `${KIND_LABEL[s.kind] ?? 'Booking'}: ${s.carrierName ?? s.fromCity ?? ''}`
            : `${KIND_LABEL[s.kind] ?? 'Booking'} booked`}`,
        ...(description ? [`DESCRIPTION:${description}`] : []),
        `URL:${config.publicBaseUrl}/${trip.slug}`,
        'END:VEVENT',
      );
    });
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
