/** No JSX anywhere: Node runs the TypeScript directly, and it only strips
 *  types. Template strings keep the app build-free. */
export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Secondary text sits a step below the headline colours on purpose: times and
 * places lead, labels and durations support. Measured on the card background,
 * light theme: body 5.9:1, labels 4.5:1, accent 6.6:1.
 */
export const CSS = `
:root {
  color-scheme: light dark;
  --ground: #eef1f2;
  --paper: #ffffff;
  --ink: #0f1316;
  --muted: #5c666c;
  --faint: #6f7980;
  --line: #d3dbde;
  --rule: #e6ebec;
  --accent: #0a6957;
  --accent-soft: #dcece7;
  --accent-line: #a6ccc3;
  --shadow: 0 1px 2px rgba(15,19,22,.05), 0 10px 28px -22px rgba(15,19,22,.45);
  --sans: "DM Sans", ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: "DM Mono", ui-monospace, "SF Mono", Menlo, monospace;

  /* Timeline geometry, so the rail and the dots cannot drift apart. */
  --dot: 12px;
  --gutter: 1.75rem;
  --when-size: 1.12rem;
  --when-line: 1.4;
  --mark-top: calc((var(--when-size) * var(--when-line) - var(--dot)) / 2);
  --rail-x: calc(var(--dot) / 2 - 1px);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #0c0f11;
    --paper: #15191c;
    --ink: #eef2f3;
    --muted: #98a3a9;
    --faint: #7d878d;
    --line: #2c3339;
    --rule: #222a2e;
    --accent: #54cfb3;
    --accent-soft: #14312b;
    --accent-line: #2d5c53;
    --shadow: 0 1px 2px rgba(0,0,0,.5), 0 12px 32px -24px rgba(0,0,0,1);
  }
}
:root[data-theme="dark"] {
  --ground: #0c0f11;
  --paper: #15191c;
  --ink: #eef2f3;
  --muted: #98a3a9;
  --faint: #7d878d;
  --line: #2c3339;
  --rule: #222a2e;
  --accent: #54cfb3;
  --accent-soft: #14312b;
  --accent-line: #2d5c53;
  --shadow: 0 1px 2px rgba(0,0,0,.5), 0 12px 32px -24px rgba(0,0,0,1);
}

* { box-sizing: border-box; }
body {
  margin: 0; background: var(--ground); color: var(--ink);
  font-family: var(--sans); font-size: 16.5px; line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 34rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
.nums { font-variant-numeric: tabular-nums; }
a { color: var(--accent); }

.card {
  background: var(--paper); border: 1px solid var(--line); border-radius: 16px;
  box-shadow: var(--shadow); padding: 2rem 1.8rem 1.5rem;
}
@media (max-width: 30rem) { .card { padding: 1.5rem 1.15rem 1.2rem; } }

h1 { font-size: 1.55rem; font-weight: 700; letter-spacing: -.025em; margin: 0 0 .2rem; text-wrap: balance; }
.sub { color: var(--muted); font-size: .92rem; margin: 0 0 1.6rem; }
.sub b { color: var(--ink); font-weight: 500; }

.flag {
  background: var(--accent-soft); color: var(--ink); border: 1px solid var(--accent-line);
  border-radius: 10px; padding: .6rem .85rem; font-size: .87rem; margin-bottom: 1.2rem;
}

/* ---- timeline ---- */
.rail { position: relative; padding-left: var(--gutter); }
.rail::before {
  content: ""; position: absolute; left: var(--rail-x);
  top: calc(var(--mark-top) + var(--dot) / 2);
  bottom: calc(var(--mark-top) + var(--dot) / 2);
  width: 2px; background: var(--line); border-radius: 2px;
}
.stop { position: relative; padding: .15rem 0; }
.stop::before {
  content: ""; position: absolute; left: calc(var(--gutter) * -1);
  top: var(--mark-top); width: var(--dot); height: var(--dot); border-radius: 50%;
  background: var(--accent); box-shadow: 0 0 0 3px var(--paper);
}
.stop.arrive::before { background: var(--paper); border: 2.5px solid var(--accent-line); }
/* The rail is one long line, so the last stop hides the tail below its dot.
   The offset is measured from the stop, which starts one gutter right of
   the rail, so the gutter has to come back off. */
.stop:last-child::after {
  content: ""; position: absolute;
  left: calc(var(--rail-x) - var(--gutter));
  top: calc(var(--mark-top) + var(--dot) / 2); bottom: -1rem; width: 2px; background: var(--paper);
}
.when { font-size: var(--when-size); line-height: var(--when-line); font-weight: 700; letter-spacing: -.015em; }
.where { font-size: .95rem; color: var(--muted); margin-top: .05rem; }
.where b { color: var(--ink); font-weight: 500; }

.hop {
  margin: .5rem 0 .5rem calc(var(--gutter) * -1); padding-left: var(--gutter);
  font-family: var(--mono); font-size: .8rem; color: var(--muted); letter-spacing: .02em;
}
.hop b { color: var(--ink); font-weight: 500; }

/* The stay is a break in the scale, so the rail goes dotted through it. */
.stay { position: relative; margin: .35rem 0 .35rem calc(var(--gutter) * -1); padding: .8rem 0 .8rem var(--gutter); }
.stay::before {
  content: ""; position: absolute; left: var(--rail-x); top: 0; bottom: 0; width: 2px;
  background-color: var(--paper);
  background-image: repeating-linear-gradient(var(--line) 0 4px, transparent 4px 9px);
}
.stay .k { font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: var(--faint); }
.stay .v { font-size: .95rem; font-weight: 500; margin-top: .1rem; }

/* A hotel or a car booked inside the gap. */
.span { margin-top: .6rem; font-size: .9rem; }
.span + .span { margin-top: .5rem; }
.span .tag {
  display: inline-block; font-size: .68rem; letter-spacing: .08em; text-transform: uppercase;
  color: var(--accent); background: var(--accent-soft); border-radius: 999px;
  padding: .1rem .5rem; vertical-align: .06em; margin-right: .35rem;
}
.span-top b { font-weight: 500; }
.span-when { color: var(--muted); font-size: .85rem; margin-top: .1rem; }
.span-rest { color: var(--faint); font-size: .82rem; margin-top: .05rem; }

/* ---- actions ---- */
.actions {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  margin-top: 1.8rem; padding-top: 1.1rem; border-top: 1px solid var(--rule);
}
.id { font-family: var(--mono); font-size: .78rem; color: var(--faint); letter-spacing: .04em; }

.split { position: relative; display: inline-flex; align-items: stretch;
  border: 1.5px solid var(--accent-line); border-radius: 999px; background: transparent; }
.split .main, .split .more {
  font: inherit; font-size: .88rem; font-weight: 500; color: var(--accent);
  background: transparent; border: 0; cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center; gap: .45rem;
}
.split .main { border-radius: 999px 0 0 999px; padding: .42rem .9rem .42rem 1.05rem; }
.split .more {
  list-style: none; border-radius: 0 999px 999px 0; padding: .42rem .7rem;
  border-left: 1px solid var(--accent-line);
}
.split .main:hover, .split .more:hover { background: var(--accent-soft); }
.split .main:focus-visible, .split .more:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.split .more::-webkit-details-marker { display: none; }
.split details { display: flex; }
.split details[open] .more { background: var(--accent-soft); }
.split svg { width: 14px; height: 14px; }

.menu {
  position: absolute; right: 0; bottom: calc(100% + .45rem); z-index: 5; min-width: 15rem;
  background: var(--paper); border: 1px solid var(--line); border-radius: 12px;
  box-shadow: var(--shadow); padding: .3rem; text-align: left;
}
.menu a {
  display: block; padding: .5rem .7rem; border-radius: 8px;
  color: var(--ink); text-decoration: none; font-size: .88rem;
}
.menu a:hover, .menu a:focus-visible { background: var(--accent-soft); outline: none; }
.menu .note { display: block; font-size: .76rem; color: var(--faint); margin-top: .1rem; }

/* ---- share ---- */
.share { border-top: 1px solid var(--rule); margin-top: 1.4rem; padding-top: 1.2rem; }
.share-label { margin: 0 0 .6rem; font-size: .7rem; text-transform: uppercase; letter-spacing: .1em; color: var(--faint); }
.share-row { display: flex; gap: .5rem; }
.share-url {
  flex: 1; min-width: 0; font: inherit; font-size: .9rem; padding: .5rem .7rem;
  border: 1px solid var(--line); border-radius: 9px; background: var(--ground); color: var(--ink);
}
.btn {
  font: inherit; font-size: .88rem; font-weight: 500; padding: .5rem 1rem; border: 0;
  border-radius: 9px; background: var(--accent); color: var(--paper); cursor: pointer;
}
.share-note { margin: .7rem 0 0; font-size: .82rem; color: var(--faint); }

/* ---- landing ---- */
.home h1 {
  font-size: 1.6rem; line-height: 1.4; font-weight: 500; letter-spacing: -.015em;
  margin: 0; text-wrap: pretty;
}
.addr {
  font: inherit; font-family: var(--mono); font-size: .93em; font-weight: 500;
  color: var(--accent); background: var(--accent-soft); border: 1px solid var(--accent-line);
  border-radius: 8px; padding: .05em .45em; cursor: pointer;
  display: inline-flex; align-items: center; gap: .35em; white-space: nowrap;
}
.addr:hover { background: var(--paper); }
.addr:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.copy-icon, .done-icon { width: .82em; height: .82em; opacity: .7; }
.done-icon, .addr.copied .copy-icon { display: none; }
.addr.copied .done-icon { display: block; opacity: 1; }

/* ---- admin tables ---- */
table { border-collapse: collapse; width: 100%; font-size: .88rem; }
th, td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid var(--rule); vertical-align: top; }
th { color: var(--faint); font-weight: 500; font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; }
pre {
  background: var(--paper); border: 1px solid var(--line); border-radius: 10px;
  padding: .9rem; overflow-x: auto; font-size: .78rem; font-family: var(--mono);
}
`;

export function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%E2%9C%88%EF%B8%8F%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body><div class="wrap">${body}</div></body></html>`;
}
