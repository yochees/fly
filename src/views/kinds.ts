/**
 * Five ways to tell a flight from a ferry from a bus from a stay at a glance.
 * The card emits the same markup for all of them (a .leg per journey with its
 * data-kind, an icon, a label); each .kinds-N class decides what shows.
 * Only /variants uses this until one is chosen.
 */

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const KIND_ICON: Record<string, string> = {
  flight: svg('<path d="M21 15.5v-1.8l-7.5-4.7V4a1.5 1.5 0 0 0-3 0v5l-7.5 4.7v1.8l7.5-2.3V18l-2 1.5V21l3.5-1 3.5 1v-1.5l-2-1.5v-4.8z"/>'),
  ferry: svg('<path d="M4 16.5 3 12h18l-1.5 4.5"/><path d="M6 12V8.5h12V12"/><path d="M10.5 8.5V5.5h3v3"/><path d="M2 20c1.7 0 1.7-1.2 3.3-1.2S7 20 8.7 20s1.7-1.2 3.3-1.2S13.7 20 15.3 20 17 18.8 18.7 18.8 20.3 20 22 20"/>'),
  bus: svg('<rect x="5" y="3" width="14" height="15" rx="2.5"/><path d="M5 7.5h14M5 12h14"/><path d="M8.5 15h.01M15.5 15h.01"/><path d="M7.5 18v2.5M16.5 18v2.5"/>'),
  train: svg('<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 10h12"/><path d="M9.5 13.5h.01M14.5 13.5h.01"/><path d="m8 21 2-4M16 21l-2-4"/>'),
  car: svg('<path d="M5 12 6.8 7.3A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.3L19 12"/><rect x="3" y="12" width="18" height="5.5" rx="1.5"/><path d="M7 15h.01M17 15h.01"/><path d="M6 17.5V20M18 17.5V20"/>'),
  hotel: svg('<path d="M3 19V6"/><path d="M3 15h18v4"/><path d="M21 15v-2.5A2.5 2.5 0 0 0 18.5 10H11v5"/><circle cx="7" cy="11.5" r="1.8"/>'),
  other: svg('<circle cx="12" cy="12" r="3"/>'),
};

export const KIND_NAME: Record<string, string> = {
  flight: 'Flight', ferry: 'Ferry', bus: 'Bus', train: 'Train', car: 'Car hire', hotel: 'Stay', other: 'Booking',
};

export const PIN = svg('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>');

export const kindIcon = (kind: string) => `<span class="ki">${KIND_ICON[kind] ?? KIND_ICON.other}</span>`;
export const kindLabel = (kind: string) => `<span class="kind">${KIND_ICON[kind] ?? KIND_ICON.other}${KIND_NAME[kind] ?? 'Booking'}</span>`;

export const VARIANTS: Array<{ n: number; name: string; idea: string; base?: number }> = [
  { n: 1, name: 'Icons on the rail', idea: 'The dot at each departure becomes the vehicle. One colour, shape does the work.' },
  { n: 2, name: 'Colour per kind', idea: 'Each journey paints its stretch of the rail in its own colour; stays are warm and dotted.' },
  { n: 3, name: 'Labels', idea: 'The rail stays as it is. A tinted label in front of each line names the kind.' },
  { n: 4, name: 'Cards', idea: 'No rail. Every journey and every stay is its own tinted block with the icon in front.' },
  { n: 5, name: 'Line patterns', idea: 'The rail itself changes: solid for a flight, waves for a ferry, dashes for a bus.' },
  { n: 6, name: 'Colour per kind, in chips', idea: 'Style 2, every kind in a tinted chip, a hotel reads as a Stay, and the place is as big as the time, with a pin.', base: 2 },
];

/** The classes a card carries for a variant: its own, plus the one it builds on. */
export const variantClass = (n: number) => {
  const base = VARIANTS.find((v) => v.n === n)?.base;
  return `kinds${base ? ` kinds-${base}` : ''} kinds-${n}`;
};

/** Waves for the ferry line in variant 5. Grey that works on both themes. */
const WAVE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='10'%3E%3Cpath d='M3 0q3 2.5 0 5t0 5' fill='none' stroke='%237d8a90' stroke-width='1.6'/%3E%3C/svg%3E")`;

export const KINDS_CSS = `
:root {
  --k-flight: #2f5fd0; --k-ferry: #08809f; --k-bus: #b56a00; --k-train: #3d7a26;
  --k-car: #7a4fd0; --k-hotel: #b8456a; --k-other: #5c666c;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --k-flight: #83a5ff; --k-ferry: #5cc6e6; --k-bus: #f0a640; --k-train: #8fd06c;
    --k-car: #b89cff; --k-hotel: #f28cab; --k-other: #98a3a9;
  }
}
:root[data-theme="dark"] {
  --k-flight: #83a5ff; --k-ferry: #5cc6e6; --k-bus: #f0a640; --k-train: #8fd06c;
  --k-car: #b89cff; --k-hotel: #f28cab; --k-other: #98a3a9;
}
[data-kind] { --k: var(--k-other); }
[data-kind="flight"] { --k: var(--k-flight); }
[data-kind="ferry"] { --k: var(--k-ferry); }
[data-kind="bus"] { --k: var(--k-bus); }
[data-kind="train"] { --k: var(--k-train); }
[data-kind="car"] { --k: var(--k-car); }
[data-kind="hotel"] { --k: var(--k-hotel); }

/* ---- shared by every variant ---- */
.leg { position: relative; }
.ki, .kind { display: none; }
.place svg { display: none; }
.where-extra { font-size: 14px; }
.ki svg, .kind svg { width: 100%; height: 100%; display: block; }
.span .tag svg { display: none; }
.kind { align-items: center; gap: .3rem; font-weight: 500; }
.kind svg { width: 15px; height: 15px; flex: none; }
/* The legs are wrapped now, so the ends of the journey are found one level down. */
.kinds .rail > .stop:first-child::before,
.kinds .rail > .stop:last-child::before { background: var(--paper); border-color: var(--accent-line); }
.kinds .rail > .leg:first-child > .stop:not(.arrive)::before,
.kinds .rail > .leg:last-child > .stop:last-child::before { background: var(--accent); border-color: var(--accent); }
.kinds .stop:last-child::after { display: none; }
.kinds .rail > .leg:last-child > .stop:last-child::after { display: block; }
.kinds .leg > .stop::before { z-index: 2; }
/* Variants 2 and 5 draw each leg's own line from the departure dot to the
   bottom of the leg. Below the arrival dot a patch puts the plain rail back,
   so the line stops at the dot however tall the arrival row is. */
.kinds-2 .leg > .stop.arrive::after, .kinds-5 .leg > .stop.arrive::after {
  display: block; content: ""; position: absolute; z-index: 1;
  top: calc(var(--mark-top) + var(--dot)); bottom: 0;
  left: calc(var(--rail-x) - var(--gutter) - 2px); width: 6px;
  background: linear-gradient(90deg, var(--paper) 2px, var(--line) 2px 4px, var(--paper) 4px);
}
.kinds-2 .rail > .leg:last-child > .stop.arrive::after,
.kinds-5 .rail > .leg:last-child > .stop.arrive::after { background: var(--paper); bottom: -1rem; }

/* ---- 1. icons on the rail ---- */
.kinds-1 .leg > .ki {
  display: block; position: absolute; z-index: 1;
  left: calc(var(--rail-x) - var(--gutter) - 12px); top: calc(var(--mark-top) - 7px);
  width: 26px; height: 26px; padding: 4.5px; border-radius: 50%;
  background: var(--paper); color: var(--accent); border: 1.5px solid var(--accent-line);
  box-shadow: 0 0 0 3px var(--paper);
}
.kinds-1 .rail > .leg:first-child > .ki,
.kinds-1 .rail > .leg:last-child > .ki { background: var(--accent); color: var(--paper); border-color: var(--accent); }
.kinds-1 .leg > .stop:not(.arrive)::before { visibility: hidden; }
.kinds-1 .stay > .ki {
  display: block; position: absolute; left: calc(var(--rail-x) - 11px); top: .75rem;
  width: 24px; height: 24px; padding: 4px; border-radius: 50%;
  background: var(--paper); color: var(--muted); box-shadow: 0 0 0 3px var(--paper);
}
.kinds-1 .hop .kind { display: inline-flex; color: var(--ink); margin-right: .15rem; }
.kinds-1 .hop .kind svg { display: none; }

/* ---- 2. colour per kind ---- */
.kinds-2 .leg::before {
  content: ""; position: absolute; z-index: 0;
  left: calc(var(--rail-x) - var(--gutter) - .5px); width: 3px; border-radius: 2px;
  top: calc(var(--mark-top) + var(--dot) / 2); bottom: 0;
  background: var(--k);
}
.kinds-2 .leg > .stop::before { border-color: var(--k); }
.kinds-2 .rail > .leg:first-child > .stop:not(.arrive)::before,
.kinds-2 .rail > .leg:last-child > .stop:last-child::before { background: var(--k); border-color: var(--k); }
.kinds-2 .hop .kind { display: inline-flex; color: var(--k); margin-right: .2rem; }
.kinds-2 .stay[data-kind]::before {
  background-image: repeating-linear-gradient(var(--k) 0 4px, transparent 4px 9px); opacity: .8;
}
.kinds-2 .stay[data-kind] .k { color: var(--k); font-weight: 500; }
.kinds-2 .span .tag { color: var(--k); background: color-mix(in srgb, var(--k) 13%, var(--paper)); }
.kinds-2 .span .tag svg { width: 13px; height: 13px; display: inline-block; vertical-align: -2px; margin-right: .25rem; }

/* ---- 3. labels ---- */
.kinds-3 .hop .kind {
  display: inline-flex; font-size: 12px; text-transform: uppercase;
  color: var(--k); background: color-mix(in srgb, var(--k) 12%, var(--paper));
  border-radius: 999px; padding: .12rem .55rem .12rem .45rem; margin-right: .4rem; vertical-align: .05em;
}
.kinds-3 .hop .kind svg { width: 13px; height: 13px; }
.kinds-3 .span .tag { color: var(--k); background: color-mix(in srgb, var(--k) 12%, var(--paper)); }
.kinds-3 .span .tag svg { width: 12px; height: 12px; display: inline-block; vertical-align: -2px; margin-right: .25rem; }

/* ---- 4. cards ---- */
.kinds-4 .rail { padding-left: 0; }
.kinds-4 .rail::before, .kinds-4 .stop::before, .kinds-4 .stop::after,
.kinds-4 .rail > .leg:last-child > .stop:last-child::after { display: none; }
.kinds-4 .leg {
  padding: .75rem .9rem .75rem 3.3rem; border-radius: 12px;
  background: color-mix(in srgb, var(--k) 8%, var(--paper));
  border: 1px solid color-mix(in srgb, var(--k) 22%, var(--paper));
}
.kinds-4 .leg > .ki {
  display: block; position: absolute; left: .8rem; top: .85rem;
  width: 30px; height: 30px; padding: 6px; border-radius: 9px; background: var(--k); color: var(--paper);
}
.kinds-4 .hop { margin: .35rem 0; padding-left: 0; }
.kinds-4 .hop .kind { display: inline-flex; color: var(--k); margin-right: .2rem; }
.kinds-4 .hop .kind svg { display: none; }
.kinds-4 .stay { margin: .5rem 0; padding: .7rem .9rem .7rem 3.3rem; border-radius: 12px; border: 1.5px dashed var(--line); }
.kinds-4 .stay[data-kind] { border-color: color-mix(in srgb, var(--k) 40%, var(--paper)); }
.kinds-4 .stay::before { display: none; }
.kinds-4 .stay > .ki {
  display: block; position: absolute; left: .8rem; top: .75rem;
  width: 30px; height: 30px; padding: 6px; border-radius: 9px;
  color: var(--k, var(--muted)); background: color-mix(in srgb, var(--k, var(--muted)) 14%, var(--paper));
}
.kinds-4 .stay .k { color: var(--k, var(--faint)); }
.kinds-4 .span .tag { color: var(--k); background: color-mix(in srgb, var(--k) 12%, var(--paper)); }
.kinds-4 .span .tag svg { display: none; }

/* ---- 5. line patterns ---- */
.kinds-5 .leg::before {
  content: ""; position: absolute; z-index: 0;
  left: calc(var(--rail-x) - var(--gutter) - 2px); width: 6px;
  top: calc(var(--mark-top) + var(--dot)); bottom: 0;
  background: var(--paper);
}
.kinds-5 .leg[data-kind="flight"]::before { background: linear-gradient(90deg, var(--paper) 1px, var(--ink) 1px 5px, var(--paper) 5px); }
.kinds-5 .leg[data-kind="ferry"]::before { background: var(--paper) ${WAVE} center top / 6px 10px repeat-y; }
.kinds-5 .leg[data-kind="bus"]::before {
  background: linear-gradient(90deg, var(--paper) 2px, transparent 2px 4px, var(--paper) 4px),
              repeating-linear-gradient(var(--muted) 0 6px, transparent 6px 10px);
}
.kinds-5 .leg[data-kind="train"]::before { background: linear-gradient(90deg, var(--paper) 1px, var(--muted) 1px 2px, var(--paper) 2px 4px, var(--muted) 4px 5px, var(--paper) 5px); }
.kinds-5 .hop { position: relative; }
.kinds-5 .hop > .ki {
  display: block; position: absolute; left: calc(var(--rail-x) - 10px); top: 50%; transform: translateY(-50%);
  width: 22px; height: 22px; padding: 3.5px; border-radius: 50%; z-index: 1;
  background: var(--paper); color: var(--ink); box-shadow: 0 0 0 2px var(--paper);
}
.kinds-5 .hop .kind { display: inline-flex; color: var(--ink); margin-right: .15rem; }
.kinds-5 .hop .kind svg { display: none; }
.kinds-5 .stay > .ki {
  display: block; position: absolute; left: calc(var(--rail-x) - 10px); top: .75rem;
  width: 22px; height: 22px; padding: 3.5px; border-radius: 50%;
  background: var(--paper); color: var(--muted); box-shadow: 0 0 0 2px var(--paper);
}

/* ---- 6. style 2, every kind in a chip ---- */
.kinds-6 .hop .kind, .kinds-6 .span .tag {
  display: inline-flex; align-items: center; gap: .3rem; font-size: 12px; font-weight: 500; text-transform: uppercase;
  color: var(--k); background: color-mix(in srgb, var(--k) 13%, var(--paper));
  border-radius: 999px; padding: .12rem .55rem .12rem .45rem; margin-right: .4rem; vertical-align: .05em;
}
.kinds-6 .hop .kind svg, .kinds-6 .span .tag svg { width: 13px; height: 13px; margin: 0; display: block; }
/* The chip already says Stay, so the heading above the nights goes. */
.kinds-6 .stay[data-kind] .k { display: none; }
.kinds-6 .stay[data-kind] .v { margin-top: 0; }

/* The place is what you look for at a glance, as much as the time. */
.kinds-6 .place {
  display: inline-flex; align-items: center; gap: .3rem;
  font-size: var(--when-size); line-height: var(--when-line); font-weight: 700; letter-spacing: -.015em; color: var(--ink);
}
.kinds-6 .place b { font-weight: 500; color: var(--muted); letter-spacing: 0; }
.kinds-6 .place svg { display: block; width: 16px; height: 16px; flex: none; color: var(--muted); }
.kinds-6 .where { margin-top: 0; }
.kinds-6 .where-extra { color: var(--muted); margin-top: .05rem; }
`;
