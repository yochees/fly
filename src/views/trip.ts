import { esc, page } from './html.ts';
import { config } from '../config.ts';

type Segment = {
  kind: string; carrier: string | null; carrierName: string | null; number: string | null;
  bookingRef: string | null; fromCode: string | null; fromCity: string | null;
  toCode: string | null; toCity: string | null; departLocal: string | null; arriveLocal: string | null;
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

/** One list, so hiding one more field later is a one line change. */
const HIDDEN_IN_PUBLIC = ['passengers', 'bookingRef', 'seat'] as const;

const time = (v: string | null) => (v ? v.slice(11, 16) : '--:--');
const day = (v: string | null) =>
  v ? new Date(`${v.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';

function segmentCard(s: Segment, view: View): string {
  const flight = [s.carrier, s.number].filter(Boolean).join(' ') || s.kind;
  const pax = (() => { try { return JSON.parse(s.passengers ?? '[]') as string[]; } catch { return []; } })();
  const show = (field: (typeof HIDDEN_IN_PUBLIC)[number]) => view === 'private' || !HIDDEN_IN_PUBLIC.includes(field);

  const meta = [
    show('bookingRef') && s.bookingRef ? `Ref ${esc(s.bookingRef)}` : '',
    show('seat') && s.seat ? `Seat ${esc(s.seat)}` : '',
    s.cabin ? esc(s.cabin) : '',
    show('passengers') && pax.length ? esc(pax.join(', ')) : '',
  ].filter(Boolean);

  return `<div class="seg">
  <div class="seg-top"><span>${esc(flight)}${s.carrierName ? ` &middot; ${esc(s.carrierName)}` : ''}</span><span>${esc(day(s.departLocal))}</span></div>
  <div class="route">
    <div><div class="code">${esc(s.fromCode ?? '???')}</div><div class="city">${esc(s.fromCity ?? '')}</div><div class="time">${esc(time(s.departLocal))}</div></div>
    <div class="arrow">&rarr;</div>
    <div class="right"><div class="code">${esc(s.toCode ?? '???')}</div><div class="city">${esc(s.toCity ?? '')}</div><div class="time">${esc(time(s.arriveLocal))}</div></div>
  </div>
  ${meta.length ? `<div class="meta">${meta.map((m) => `<span>${m}</span>`).join('')}</div>` : ''}
</div>`;
}

function shareBox(trip: Trip): string {
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

export function tripPage(trip: Trip, segs: Segment[], view: View): string {
  const range = trip.startDate
    ? `${day(trip.startDate)}${trip.endDate && trip.endDate !== trip.startDate ? ` &ndash; ${day(trip.endDate)}` : ''}`
    : '';

  const icsHref = view === 'private' && trip.privateKey ? `/t/${esc(trip.privateKey)}.ics` : `/${esc(trip.slug)}.ics`;

  const body = `
${view === 'private' && trip.needsReview ? '<div class="flag">Some details were unclear when this was read. Check the times against your ticket.</div>' : ''}
<h1>${esc(trip.title ?? 'Trip')}</h1>
<p class="sub">${range}</p>
${segs.map((s) => segmentCard(s, view)).join('')}
${view === 'private' ? shareBox(trip) : ''}
<footer>fly &middot; ${esc(trip.slug)} &middot; <a href="${icsHref}">add to calendar</a></footer>`;

  return page(trip.title ?? `Trip ${trip.slug}`, body);
}

/** Minimal iCalendar file. Times are local with a zone, exactly as ticketed. */
export function tripIcs(trip: Trip, segs: Segment[], view: View): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  // Calendars want YYYYMMDDTHHMMSS. Our times carry no seconds, so pad them.
  const fmt = (v: string | null) => {
    if (!v) return '';
    const t = v.replace(/[-:]/g, '').slice(0, 15);
    return t.length === 13 ? `${t}00` : t;
  };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//fly//EN', 'CALSCALE:GREGORIAN'];

  segs.forEach((s, i) => {
    if (!s.departLocal) return;
    const description = view === 'private'
      ? [s.bookingRef && `Ref ${s.bookingRef}`, s.seat && `Seat ${s.seat}`].filter(Boolean).join(', ')
      : '';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${trip.slug}-${i}@fly.diz.lt`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${fmt(s.departLocal)}`,
      s.arriveLocal ? `DTEND:${fmt(s.arriveLocal)}` : `DURATION:PT2H`,
      `SUMMARY:${[s.carrier, s.number].filter(Boolean).join(' ')} ${s.fromCode ?? ''} to ${s.toCode ?? ''}`,
      ...(description ? [`DESCRIPTION:${description}`] : []),
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
