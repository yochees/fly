import { page } from './html.ts';

/**
 * Written plainly on purpose. Two things are named here that the first draft
 * did not: OpenAI, which reads every forwarded email to pull the trip out of
 * it, and Cloudflare, which holds the data. A policy that left them out would
 * be wrong rather than short.
 */
export function privacyPage(): string {
  const body = `<div class="card prose">
  <h1>Privacy</h1>
  <p class="lede">For debugging there is basically no privacy. Read that first, then the detail.</p>

  <h2>Who can read what you send</h2>
  <p>Everything you forward is stored: the message, its attachments and what the parser made of it. The team, currently one person, can open all of it. That is how a trip that came out wrong gets fixed.</p>

  <h2>Who else it passes through</h2>
  <ul>
    <li><b>OpenMail</b> (omail.sh) receives the mail and extracts text from attachments.</li>
    <li><b>OpenAI</b> reads the text, the PDFs and the photos to turn them into a trip.</li>
    <li><b>Cloudflare</b> runs the site and holds the database.</li>
  </ul>
  <p>That is the whole list.</p>

  <h2>Where it does not go</h2>
  <p>Your data stays with us. It is not sold, swapped or handed to anyone else, now or in the future. One exception: a request from law enforcement with good reason behind it.</p>

  <h2>Links you share</h2>
  <p>A shared link drops passenger names, booking references, seat numbers and hotel details before the page is built, so they are not in the page at all. The link itself is unguessable, but it needs no password: anyone you send it to can open it, and so can anyone they pass it on to.</p>

  <h2>Getting your data removed</h2>
  <p>Ask, and it goes: <a href="mailto:fly@diz.lt?subject=delete%20my%20data">fly@diz.lt</a>. Emails, trips, links, all of it.</p>

  <p class="stamp">9 September 2026</p>
</div>`;

  return page('fly - privacy', body);
}
