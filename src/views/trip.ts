import { esc, page } from './html.ts';

type Segment = {
  kind: string; carrier: string | null; carrierName: string | null; number: string | null;
  bookingRef: string | null; fromCode: string | null; fromCity: string | null;
  toCode: string | null; toCity: string | null; departLocal: string | null; arriveLocal: string | null;
  cabin: string | null; seat: string | null; passengers: string | null;
};

type Trip = { slug: string; title: string | null; startDate: string | null; endDate: string | null; needsReview: boolean };

const time = (v: string | null) => (v ? v.slice(11, 16) : '--:--');
const day = (v: string | null) =>
  v ? new Date(`${v.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';

function segmentCard(s: Segment): string {
  const flight = [s.carrier, s.number].filter(Boolean).join(' ') || s.kind;
  const pax = (() => { try { return JSON.parse(s.passengers ?? '[]') as string[]; } catch { return []; } })();
  const meta = [
    s.bookingRef ? `Ref ${esc(s.bookingRef)}` : '',
    s.seat ? `Seat ${esc(s.seat)}` : '',
    s.cabin ? esc(s.cabin) : '',
    pax.length ? esc(pax.join(', ')) : '',
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

export function tripPage(trip: Trip, segs: Segment[]): string {
  const range = trip.startDate
    ? `${day(trip.startDate)}${trip.endDate && trip.endDate !== trip.startDate ? ` &ndash; ${day(trip.endDate)}` : ''}`
    : '';

  const body = `
${trip.needsReview ? '<div class="flag">Some details were unclear when this was read. Check the times against your ticket.</div>' : ''}
<h1>${esc(trip.title ?? 'Your trip')}</h1>
<p class="sub">${range}</p>
${segs.map(segmentCard).join('')}
<footer>venga &middot; ${esc(trip.slug)} &middot; <a href="/${esc(trip.slug)}.ics">add to calendar</a></footer>`;

  return page(trip.title ?? `Trip ${trip.slug}`, body);
}

/** Minimal iCalendar file. Times are local with a zone, exactly as ticketed. */
export function tripIcs(trip: Trip, segs: Segment[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const fmt = (v: string | null) => (v ? v.replace(/[-:]/g, '').slice(0, 15) : '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//venga//EN', 'CALSCALE:GREGORIAN'];

  segs.forEach((s, i) => {
    if (!s.departLocal) return;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${trip.slug}-${i}@fly.diz.lt`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${fmt(s.departLocal)}`,
      s.arriveLocal ? `DTEND:${fmt(s.arriveLocal)}` : `DURATION:PT2H`,
      `SUMMARY:${[s.carrier, s.number].filter(Boolean).join(' ')} ${s.fromCode ?? ''} to ${s.toCode ?? ''}`,
      `DESCRIPTION:${[s.bookingRef && `Ref ${s.bookingRef}`, s.seat && `Seat ${s.seat}`].filter(Boolean).join(', ')}`,
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
