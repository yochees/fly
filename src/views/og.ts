import { CSS, esc } from './html.ts';
import { config } from '../config.ts';
import { tripCard } from './trip.ts';
import { sampleTrip, sampleSegments } from './sample.ts';

/**
 * The picture people see when a link is shared. Rendered as a page at /og so
 * it can be re-shot whenever the card changes, then baked into og.png.
 * 1200 x 630 is what every social preview crops to.
 */
export function ogPage(): string {
  const address = config.openmail.inboxAddress || 'fly@omail.sh';

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap">
<title>fly</title>
<style>${CSS}
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body { display: flex; gap: 56px; padding: 0 72px; align-items: center; background: var(--ground); }
  .og-left { width: 440px; flex: none; }
  .og-left h1 { font-size: 40px; line-height: 1.25; font-weight: 500; letter-spacing: -.02em; margin: 0 0 20px; }
  .og-left .addr-plain { color: var(--accent); font-weight: 700; }
  .og-left p { margin: 0; font-size: 18px; color: var(--muted); }
  .og-right { flex: 1; min-width: 0; }
  /* The card is taller than the frame on purpose: it runs off the bottom
     edge, which reads as a real page rather than a cropped screenshot. */
  .og-right .card { margin: 0; transform: translateY(30px); }
  .site-footer, .actions { display: none; }
</style></head>
<body>
  <div class="og-left">
    <h1>Forward your tickets and bookings to <span class="addr-plain">${esc(address)}</span> and get a clean, shareable agenda.</h1>
    <p>fly.diz.lt</p>
  </div>
  <div class="og-right">${tripCard(sampleTrip, sampleSegments as never, 'private', { chrome: false })}</div>
</body></html>`;
}
