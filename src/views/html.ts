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

export const CSS = `
:root {
  color-scheme: light dark;
  --bg: #fbfaf8; --card: #ffffff; --ink: #16150f; --muted: #6d6a5e;
  --line: #e6e2d8; --accent: #b4472a;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #14140f; --card: #1c1c17; --ink: #f2efe6; --muted: #a09c8e; --line: #2e2d26; --accent: #e27a58; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink);
  font: 16px/1.5 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif; }
.wrap { max-width: 44rem; margin: 0 auto; padding: 2.5rem 1.25rem 5rem; }
h1 { font-size: 1.9rem; letter-spacing: -0.02em; margin: 0 0 .25rem; }
.sub { color: var(--muted); margin: 0 0 2rem; font-variant-numeric: tabular-nums; }
.seg { background: var(--card); border: 1px solid var(--line); border-radius: 14px;
  padding: 1.1rem 1.25rem; margin-bottom: .9rem; }
.seg-top { display: flex; justify-content: space-between; gap: 1rem;
  color: var(--muted); font-size: .82rem; text-transform: uppercase; letter-spacing: .06em; }
.route { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: .75rem; margin: .8rem 0 .3rem; }
.code { font-size: 1.7rem; font-weight: 650; letter-spacing: -0.01em; }
.city { color: var(--muted); font-size: .85rem; }
.time { font-size: 1.05rem; font-variant-numeric: tabular-nums; }
.arrow { color: var(--line); font-size: 1.3rem; }
.right { text-align: right; }
.meta { display: flex; flex-wrap: wrap; gap: .4rem .9rem; margin-top: .7rem;
  padding-top: .7rem; border-top: 1px solid var(--line); color: var(--muted); font-size: .84rem; }
.flag { background: #fff3cd; color: #6b5400; border-radius: 8px; padding: .6rem .8rem;
  font-size: .85rem; margin-bottom: 1.2rem; }
@media (prefers-color-scheme: dark) { .flag { background: #3a3213; color: #f0dfa0; } }
footer { margin-top: 2.5rem; color: var(--muted); font-size: .8rem; }
a { color: var(--accent); }
table { border-collapse: collapse; width: 100%; font-size: .85rem; }
th, td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid var(--line); vertical-align: top; }
pre { background: var(--card); border: 1px solid var(--line); border-radius: 10px;
  padding: .9rem; overflow-x: auto; font-size: .78rem; }
`;

export function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${CSS}${SHARE_CSS}</style></head>
<body><div class="wrap">${body}</div></body></html>`;
}

export const SHARE_CSS = `
.share { background: var(--card); border: 1px solid var(--line); border-radius: 14px;
  padding: 1rem 1.25rem; margin-top: 1.8rem; }
.share-label { margin: 0 0 .6rem; font-size: .82rem; text-transform: uppercase;
  letter-spacing: .06em; color: var(--muted); }
.share-row { display: flex; gap: .5rem; }
.share-url { flex: 1; min-width: 0; font: inherit; font-size: .92rem; padding: .5rem .7rem;
  border: 1px solid var(--line); border-radius: 9px; background: var(--bg); color: var(--ink); }
.btn { font: inherit; font-size: .92rem; padding: .5rem .9rem; border: 1px solid var(--line);
  border-radius: 9px; background: var(--accent); color: #fff; cursor: pointer; }
.share-note { margin: .7rem 0 0; font-size: .82rem; color: var(--muted); }
`;
