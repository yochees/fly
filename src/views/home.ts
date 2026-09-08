import { page, esc } from './html.ts';
import { config } from '../config.ts';

const COPY_ICON = `<svg class="copy-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5v-1h-8v8h1"/></svg>`;
const DONE_ICON = `<svg class="done-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5"/></svg>`;
const CAL_ICON = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/></svg>`;

/**
 * A made up trip, so the two views can be compared without anyone's real
 * booking on a public page. Both versions are in the markup and the toggle
 * swaps them; the live pages build only the version you are allowed to see.
 */
function sample(): string {
  return `<div class="card">
  <div class="sample-head">
    <span class="sample-label">Sample trip</span>
    <div class="toggle" role="group" aria-label="Which view">
      <button type="button" class="on" data-view="private">Yours</button>
      <button type="button" data-view="public">Shared</button>
    </div>
  </div>

  <div class="sample" data-view="private">
    <h2 class="sample-title">Vilnius to Lisbon</h2>
    <p class="sub">Wed 7 &ndash; Mon 12 Oct 2026 &middot; <b>TP 1234</b>, <b>TP 1235</b></p>

    <div class="rail">
      <div class="stop">
        <div class="when nums">Wed 7 Oct &middot; 06:20</div>
        <div class="where">Vilnius <b>VNO</b><span class="private-only"> &middot; seat 12C &middot; ref 8KQ2ZP &middot; A. Petrauskas</span></div>
      </div>
      <div class="hop"><b>4h 25m</b> &middot; TP 1234 &middot; TAP Air Portugal</div>
      <div class="stop arrive">
        <div class="when nums">09:45</div>
        <div class="where">Lisbon <b>LIS</b></div>
      </div>

      <div class="stay">
        <div class="k">Stay</div>
        <div class="v">5 nights</div>

        <div class="span private-only">
          <div class="span-top"><span class="tag">Hotel</span> <b>Baixa House</b></div>
          <div class="span-when nums">Wed 7 Oct 14:00 to Mon 12 Oct 11:00</div>
          <div class="span-rest">Rua da Prata 12, 1100-414 Lisbon &middot; ref 55-118-902</div>
        </div>
        <div class="span private-only">
          <div class="span-top"><span class="tag">Car hire</span> <b>Europcar</b></div>
          <div class="span-when nums">Wed 7 Oct 10:30 to Mon 12 Oct 16:00</div>
          <div class="span-rest">Lisbon airport, terminal 1 desk &middot; ref RN4471280</div>
        </div>
        <div class="span public-only"><span class="tag">Hotel booked</span></div>
        <div class="span public-only"><span class="tag">Car hire booked</span></div>
      </div>

      <div class="stop">
        <div class="when nums">Mon 12 Oct &middot; 18:10</div>
        <div class="where">Lisbon <b>LIS</b><span class="private-only"> &middot; seat 9A &middot; ref 8KQ2ZP &middot; A. Petrauskas</span></div>
      </div>
      <div class="hop"><b>4h 45m</b> &middot; TP 1235 &middot; TAP Air Portugal</div>
      <div class="stop arrive">
        <div class="when nums">23:55</div>
        <div class="where">Vilnius <b>VNO</b></div>
      </div>
    </div>

    <div class="actions">
      <span class="id">fly &middot; K4M7QD</span>
      <div class="split">
        <span class="main">${CAL_ICON}Add to calendar</span>
        <span class="more"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6.5 8 10.5 12 6.5"/></svg></span>
      </div>
    </div>

    <p class="sample-note private-only">Your link. Seats, references, names, the hotel and its address.</p>
    <p class="sample-note public-only">The link you share. Names, references, seats and the hotel are removed before the page is built.</p>
  </div>
</div>`;
}

export function homePage(): string {
  const address = config.openmail.inboxAddress || 'fly@omail.sh';

  const body = `<div class="card home">
  <h1>Forward your flight tickets, car rentals, ferries and hotels to <button type="button" class="addr" data-copy="${esc(address)}" aria-label="Copy ${esc(address)}"><span>${esc(address)}</span>${COPY_ICON}${DONE_ICON}</button> and get a clean, shareable agenda.</h1>
</div>

${sample()}

<script>
document.querySelector('.addr')?.addEventListener('click', async (e) => {
  const button = e.currentTarget;
  let ok = false;
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    ok = true;
  } catch {
    const field = document.createElement('textarea');
    field.value = button.dataset.copy;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    ok = document.execCommand('copy');
    field.remove();
  }
  if (!ok) return;
  button.classList.add('copied');
  setTimeout(() => button.classList.remove('copied'), 1800);
});

const sample = document.querySelector('.sample');
for (const button of document.querySelectorAll('.toggle button')) {
  button.addEventListener('click', () => {
    sample.dataset.view = button.dataset.view;
    for (const other of document.querySelectorAll('.toggle button')) other.classList.toggle('on', other === button);
  });
}
</script>`;

  return page('fly - forward a ticket, get a page', body);
}
