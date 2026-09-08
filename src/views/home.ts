import { page, esc } from './html.ts';
import { config } from '../config.ts';

/** One sentence, the address, and a way to copy it. Nothing else. */
export function homePage(): string {
  const address = config.openmail.inboxAddress || 'fly@omail.sh';

  const body = `<div class="card home">
  <p class="home-mark">fly</p>
  <h1>Forward your flight tickets, car rentals, ferries and hotels to
    <span class="home-addr">${esc(address)}</span> and get a clean, shareable agenda.</h1>

  <div class="home-copy">
    <input class="share-url" value="${esc(address)}" readonly aria-label="Address to forward to" onclick="this.select()">
    <button class="btn" type="button" data-copy="${esc(address)}">Copy</button>
  </div>
  <p class="home-note">Forwarding a real email is the point, so this is an address to copy, not a link to click.</p>
</div>
<script>
document.querySelector('[data-copy]')?.addEventListener('click', (e) => {
  const button = e.currentTarget;
  navigator.clipboard.writeText(button.dataset.copy).then(() => {
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
  });
});
</script>`;

  return page('fly - forward a ticket, get a page', body);
}
