import { page } from './html.ts';
import { config } from '../config.ts';

/** The whole product in one screen: what to do, what comes back. */
export function homePage(): string {
  const address = config.openmail.inboxAddress || 'fly@omail.sh';

  const body = `<div class="card home">
  <p class="home-mark">fly</p>
  <h1>Forward a ticket. Get a page.</h1>
  <p class="home-lead">Send any booking confirmation to the address below. A minute later you get back a link that shows the whole trip on one page, in order, with nothing else on it.</p>

  <p class="home-address"><a href="mailto:${address}">${address}</a></p>

  <ol class="steps">
    <li><b>Forward the email.</b> Airline confirmations, boarding passes, hotel bookings, car hire, ferries. A photo of a boarding pass works too, and so does a PDF.</li>
    <li><b>It gets read.</b> Flights, times, seats and references come out of the text, the attachments and the pictures.</li>
    <li><b>You get two links.</b> A private one with everything on it, and a short one you can share.</li>
  </ol>

  <div class="home-split">
    <div>
      <p class="home-k">Your link</p>
      <p class="home-v">Seats, booking references, passenger names, the hotel and its address. The things you need at a desk.</p>
    </div>
    <div>
      <p class="home-k">The shared link</p>
      <p class="home-v">Flights, times and how long you are away. Names, references, seats and the hotel are removed before the page is built.</p>
    </div>
  </div>

  <p class="home-note">Send the return leg later and it joins the same page. Add the trip to your calendar as one event, or one file for each booking. No account, no password, no app.</p>
</div>`;

  return page('fly - forward a ticket, get a page', body);
}
