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

- **One process.** Hono web server and the job worker run together, which is why
  SQLite is enough. No Redis, no Postgres, no queue service.
- **Identity is the sender address.** No sign-up yet. Google and Apple sign-in
  will replace the private key without changing the route.
- **Two views of one trip.**
  `/t/<privateKey>` is the owner page with everything on it.
  `/<slug>` is the page you share: passenger names and the booking reference are
  removed. The list of hidden fields is `HIDDEN_IN_PUBLIC` in `src/views/trip.ts`.
- **Merging.** A thread id or a booking reference is proof and decides on its own.
  The model only chooses when neither matches.
- **Every segment has a dedupe key** (carrier, number, date, origin), so the same
  ticket forwarded twice changes nothing.
- **Debugging.** Every email keeps its raw webhook payload, its headers, a local
  copy of each attachment, and every model request, response, token count and cost.

## Run it

```bash
npm install
npm run dev                      # http://localhost:3000
npm run replay fixtures/lot-outbound.json   # signed test event, no tunnel needed
npm run ingest                   # pull mail that arrived before the webhook existed
```

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

## Deploy

Hetzner CX22, one Node process behind Caddy, SQLite in `/data`, Litestream
copying the database to object storage. `fly.diz.lt` points at the box, and the
OpenMail webhook for the `fly` inbox points at `https://fly.diz.lt/hooks/openmail`.

## TODO

- [ ] Google and Apple sign-in for the private view.
- [ ] Let a user rename the slug. `trip_slugs` already keeps old links alive.
- [ ] Litestream backup in the deploy.
- [ ] Rate limit per sender address.
- [ ] Hotel and train segments on the page (the schema already holds them).
