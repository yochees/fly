import { CSS, esc } from './html.ts';
import { tripCard, type View } from './trip.ts';
import { KINDS_CSS, VARIANTS } from './kinds.ts';
import { albaniaTrip, albaniaSegments, albaniaCar } from './albania.ts';

export type VariantQuery = { view: View; car: boolean; only: number | null; theme: 'light' | 'dark' | null };

/** Five styles of the same trip side by side, to pick one. Local only. */
export function variantsPage(q: VariantQuery): string {
  const segs = q.car ? [...albaniaSegments, albaniaCar] : albaniaSegments;
  const shown = q.only ? VARIANTS.filter((v) => v.n === q.only) : VARIANTS;

  const link = (patch: Partial<VariantQuery>, label: string, on: boolean) => {
    const next = { ...q, ...patch };
    const params = new URLSearchParams();
    if (next.view === 'public') params.set('view', 'public');
    if (next.car) params.set('car', '1');
    if (next.only) params.set('v', String(next.only));
    if (next.theme) params.set('theme', next.theme);
    const qs = params.toString();
    return `<a class="${on ? 'on' : ''}" href="/variants${qs ? `?${qs}` : ''}">${esc(label)}</a>`;
  };

  const controls = `<nav class="controls">
  <span>${link({ view: 'private' }, 'Owner', q.view === 'private')}${link({ view: 'public' }, 'Public', q.view === 'public')}</span>
  <span>${link({ car: false }, 'As booked', !q.car)}${link({ car: true }, '+ car hire', q.car)}</span>
  <span>${link({ theme: null }, 'System', !q.theme)}${link({ theme: 'light' }, 'Light', q.theme === 'light')}${link({ theme: 'dark' }, 'Dark', q.theme === 'dark')}</span>
  <span>${link({ only: null }, 'All', !q.only)}${VARIANTS.map((v) => link({ only: v.n }, String(v.n), q.only === v.n)).join('')}</span>
</nav>`;

  const cards = shown.map((v) => `<section>
  <h2>${v.n}. ${esc(v.name)}</h2>
  <p class="idea">${esc(v.idea)}</p>
  ${tripCard(albaniaTrip, segs as never, q.view, { chrome: false, icsBase: '#', variant: v.n })}
</section>`).join('\n');

  return `<!doctype html><html lang="en"${q.theme ? ` data-theme="${q.theme}"` : ''}><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap">
<title>Kind variants</title>
<style>${CSS}${KINDS_CSS}
  .variants { padding: 2rem 1rem 4rem; max-width: 120rem; margin: 0 auto; }
  .variants > h1 { margin-bottom: .3rem; }
  .grid { display: grid; gap: 2rem 1.5rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 25rem), 1fr)); align-items: start; }
  .grid.one { grid-template-columns: minmax(0, 34rem); justify-content: center; }
  section h2 { font-size: 18px; margin: 0 0 .15rem; }
  .idea { color: var(--muted); font-size: 14px; margin: 0 0 .8rem; min-height: 2.6em; }
  .controls { display: flex; flex-wrap: wrap; gap: .6rem 1rem; margin: 0 0 1.8rem; font-size: 14px; }
  .controls span { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; padding: 2px; }
  .controls a { color: var(--muted); text-decoration: none; padding: .2rem .7rem; border-radius: 999px; }
  .controls a.on { background: var(--accent); color: var(--paper); }
</style></head>
<body><div class="variants">
<h1>Telling bookings apart</h1>
<p class="sub">The Albania trip in five styles. Flight, bus, ferry and stays are real; add a car to see that one too.</p>
${controls}
<div class="grid${q.only ? ' one' : ''}">
${cards}
</div>
</div></body></html>`;
}
