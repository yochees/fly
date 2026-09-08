import { page, esc } from './html.ts';
import { config } from '../config.ts';

/** One sentence. The address in it is the button. */
export function homePage(): string {
  const address = config.openmail.inboxAddress || 'fly@omail.sh';
  const copyIcon = `<svg class="copy-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5v-1h-8v8h1"/></svg>`;
  const doneIcon = `<svg class="done-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5"/></svg>`;

  const body = `<div class="card home">
  <h1>Forward your flight tickets, car rentals, ferries and hotels to <button type="button" class="addr" data-copy="${esc(address)}" aria-label="Copy ${esc(address)}"><span class="addr-text">${esc(address)}</span>${copyIcon}${doneIcon}</button> and get a clean, shareable agenda.</h1>
</div>
<script>
document.querySelector('.addr')?.addEventListener('click', async (e) => {
  const button = e.currentTarget;
  const text = button.dataset.copy;
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    // Older browsers, and any page the clipboard API is blocked on.
    const field = document.createElement('textarea');
    field.value = text;
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
</script>`;

  return page('fly - forward a ticket, get a page', body);
}
