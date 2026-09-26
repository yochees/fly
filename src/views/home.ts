import { page, copyable } from './html.ts';
import { config } from '../config.ts';
import { tripCard } from './trip.ts';
import { sampleTrip, sampleSegments } from './sample.ts';

export function homePage(): string {
  const address = config.openmail.inboxAddress || 'fly@omail.sh';

  // Both views are rendered by the same code the real pages use, so the demo
  // cannot drift from the product, and Add to calendar downloads real files.
  const cardFor = (view: 'private' | 'public') =>
    tripCard(sampleTrip, sampleSegments as never, view, {
      icsBase: `/sample.ics?view=${view}`,
      chrome: false,
    });

  const body = `<div class="card home">
  <h1>Forward your tickets and bookings to ${copyable(address, 'addr')} and get a clean, shareable agenda.</h1>
</div>

<div class="sample-head">
  <span class="sample-label">Sample trip</span>
  <div class="toggle" role="group" aria-label="Which view">
    <button type="button" class="on" data-view="private">Yours</button>
    <button type="button" data-view="public">Shared</button>
  </div>
</div>

<div class="sample" data-view="private">
  <div class="private-only">${cardFor('private')}</div>
  <div class="public-only">${cardFor('public')}</div>
</div>

<script>
const sample = document.querySelector('.sample');
for (const button of document.querySelectorAll('.toggle button')) {
  button.addEventListener('click', () => {
    sample.dataset.view = button.dataset.view;
    for (const other of document.querySelectorAll('.toggle button')) other.classList.toggle('on', other === button);
  });
}
document.addEventListener('click', (e) => {
  for (const d of document.querySelectorAll('details[open]')) if (!d.contains(e.target)) d.open = false;
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') for (const d of document.querySelectorAll('details[open]')) d.open = false;
});
</script>`;

  return page('fly - forward a ticket, get a page', body, { image: true });
}
