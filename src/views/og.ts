import { CSS } from './html.ts';
import { tripCard } from './trip.ts';
import { sampleTrip, sampleSegments } from './sample.ts';

/**
 * The picture people see when a link is shared. Rendered as a page at /og so
 * it can be re-shot whenever the card changes, then baked into og.png.
 * 1200 x 630 is what every social preview crops to.
 */
export function ogPage(scale = 1): string {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap">
<title>fly</title>
<style>${CSS}
  /* At scale 2 the whole layout is drawn twice as large, so the shot is a
     genuine 2400x1260 image rather than an upscaled one. */
  html { zoom: ${scale}; }                        /* once, not on both, or it squares */
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    display: flex; justify-content: center; align-items: flex-start;
    padding: 54px 0 0; background: var(--ground);
  }
  /* No words of ours in the picture: the trip is the whole message. It runs
     off the bottom edge so it reads as a page, not a cropped screenshot. */
  .card { width: 660px; margin: 0; }
  .site-footer, .actions { display: none; }
</style></head>
<body>${tripCard(sampleTrip, sampleSegments as never, 'private', { chrome: false })}</body></html>`;
}
