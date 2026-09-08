# fly

Forward a ticket to **fly@omail.sh** and get back a short link, for example
`https://fly.diz.lt/PCQP9D`, that shows the trip on one clean page.

## How it works

```
forwarded mail -> OpenMail -> POST /hooks/openmail -> emails table + job
                                                          |
                                     worker: read text, images and PDFs
                                     -> OpenAI (fast model, strict JSON)
                                     -> escalate to the strong model if unsure
                                     -> match against the sender's recent trips
                                     -> create or update the trip
                                     -> reply with the link
```

- **It runs on Cloudflare Workers.** D1 for the data, R2 for attachments,
  Queues for the parse job. Nothing to keep running, and the free tier covers it.
- **Identity is the sender address.** No sign-up yet. Google and Apple sign-in
  will replace the private key without changing the route.
- **Flights, trains, ferries, hotels and car hire.** Things that move you become
  stops on the rail. Hotels and cars fill the gap between them.
- **Two views of one trip.**
  `/t/<privateKey>` is the owner page with everything on it: seats, references,
  hotel name, address, confirmation numbers, which is what you need at a desk.
  `/<slug>` is the page you share. Private fields are dropped **server side**, so
  they are absent from the HTML, from the .ics file and from the names of the
  files inside the zip. Reading the page source shows nothing extra.
- **Merging.** A thread id or a booking reference is proof and decides on its own.
  The model only chooses when neither matches.
- **Every segment has a dedupe key** (carrier, number, date, origin), so the same
  ticket forwarded twice changes nothing.
- **Debugging.** Every email keeps its raw webhook payload, its headers, a local
  copy of each attachment, and every model request, response, token count and cost.

## Run it

```bash
npm install
npm run migrate:local            # apply the schema to the local D1
npm run dev                      # wrangler dev, http://localhost:8787
PORT=8787 npm run replay fixtures/lot-outbound.json   # signed test event
```

Deploy:

```bash
npm run migrate:remote
npm run deploy
npm run tail                     # live logs
```

Secrets live in Cloudflare, not in the repo:

```bash
wrangler secret put OPENMAIL_API_KEY
wrangler secret put OPENMAIL_INBOX_ID
wrangler secret put OPENMAIL_WEBHOOK_SECRET
wrangler secret put OPENAI_API_KEY
wrangler secret put ADMIN_TOKEN
```

For local development the same values sit in `.dev.vars`, which is gitignored.

Admin page: `/admin?token=$ADMIN_TOKEN`. It lists every email, shows the raw
payload and the model output, and can parse an email again with either model.

## Configuration

See `.env`. The values that matter:

| Variable | Meaning |
|---|---|
| `MODEL_FAST` | first pass on every email |
| `MODEL_STRONG` | used when confidence is low, a field is missing, or text came from OCR |
| `CONFIDENCE_THRESHOLD` | below this the strong model runs |
| `SEND_CONFIRMATION` | reply to the sender with the link |
| `LLM_MODE` | `live` or `replay` |

## Where it runs

Cloudflare Workers on `fly.diz.lt`, with D1 (`fly`), R2 (`fly-files`) and a
queue (`fly-jobs`). The OpenMail webhook for the `fly` inbox points at
`https://fly.diz.lt/hooks/openmail`.

The webhook only stores the message and enqueues; the parse happens in the
queue consumer, because OpenMail wants a 2xx within 15 seconds and a model call
can take twenty.

## TODO

- [ ] Google and Apple sign-in for the private view.
- [ ] Let a user rename the slug. `trip_slugs` already keeps old links alive.

- [ ] Rate limit per sender address.
- [ ] Hotel and train segments on the page (the schema already holds them).
