import { page, copyable, FOOTER } from './html.ts';
import { config } from '../config.ts';
import { tripCard } from './trip.ts';
import { sampleTrip, sampleSegments } from './sample.ts';

const PAPERCLIP = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';

/**
 * The forward, told in three beats over the sample: an email with the
 * bookings goes to the inbox address, folds into a paper plane and flies off,
 * and the trip page takes its place. Decoration only, so screen readers skip it.
 */
function demo(address: string): string {
  const attachments = ['e-ticket-8KQ2ZP.pdf', 'Baixa-House-55-118-902.pdf', 'Europcar-RN4471280.pdf'];
  return `<div class="demo" aria-hidden="true">
  <div class="mail">
    <div class="mail-bar"><span class="mail-dots"><i></i><i></i><i></i></span>Forward</div>
    <div class="mail-row"><span class="mail-k">To</span><span class="mail-to">${address}</span></div>
    <div class="mail-row"><span class="mail-k">Subject</span><span>Fwd: Lisbon in October</span></div>
    <div class="mail-body">
      <p>Flights, the hotel and the car for Lisbon.</p>
      <div class="mail-files">${attachments.map((name) => `<span class="mail-file">${PAPERCLIP}${name}</span>`).join('')}</div>
    </div>
    <div class="mail-foot"><span class="mail-send">Send</span></div>
  </div>
  <div class="flight">
    <svg class="trail" viewBox="0 0 310 220" aria-hidden="true">
      <mask id="trail-mask"><path class="trail-reveal" d="M30 200 C 90 230, 150 150, 120 110 S 200 30, 300 60" pathLength="1"/></mask>
      <path class="trail-line" d="M30 200 C 90 230, 150 150, 120 110 S 200 30, 300 60" mask="url(#trail-mask)"/>
    </svg>
    <svg class="plane" viewBox="0 0 24 24" width="34" height="34"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>
  </div>
</div>`;
}

export function homePage(): string {
  const address = config.openmail.inboxAddress || 'fly@omail.sh';

  // Both views are rendered by the same code the real pages use, so the demo
  // cannot drift from the product, and Add to calendar downloads real files.
  const cardFor = (view: 'private' | 'public') =>
    tripCard(sampleTrip, sampleSegments as never, view, {
      icsBase: `/sample.ics?view=${view}`,
      chrome: false,
    });

  const body = `<div class="home-grid">
<div class="intro">
  <h1>Your trip, all in one place</h1>
  <p class="lede">Forward your tickets and bookings to ${copyable(address, 'addr')} and get a clean, shareable agenda.</p>
  ${FOOTER}
</div>

<div class="showcase">
<div class="sample-head">
  <span class="sample-label">Sample trip <button type="button" class="replay" hidden>Replay</button></span>
  <div class="toggle" role="group" aria-label="Which view">
    <button type="button" class="on" data-view="private">Yours</button>
    <button type="button" data-view="public">Shared</button>
  </div>
</div>

<div class="sample" data-view="private">
  ${demo(address)}
  <div class="private-only">${cardFor('private')}</div>
  <div class="public-only">${cardFor('public')}</div>
</div>
</div>
</div>

<script>
const sample = document.querySelector('.sample');
const showcase = document.querySelector('.showcase');
const replay = document.querySelector('.replay');
// The demo plays once, when the sample first comes into view. Reduced motion
// gets the result straight away, and so does a browser without the script.
const play = () => {
  showcase.classList.remove('play');
  void showcase.offsetWidth;
  showcase.classList.add('play');
};
const stop = () => showcase.classList.remove('play');
sample.addEventListener('animationend', (e) => { if (e.animationName === 'result-in') stop(); });
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  replay.hidden = false;
  replay.addEventListener('click', play);
  new IntersectionObserver((entries, observer) => {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    play();
  }, { threshold: .35 }).observe(sample);
}
for (const button of document.querySelectorAll('.toggle button')) {
  button.addEventListener('click', () => {
    stop();
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

  return page('fly - forward a ticket, get a page', body, { image: true, home: true });
}
