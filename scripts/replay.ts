/**
 * Posts a saved webhook payload to the local app, signed like OpenMail signs it.
 * Usage: npm run replay fixtures/lot-outbound.json
 */
import { readFile } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';

const file = process.argv[2];
if (!file) throw new Error('usage: npm run replay <fixture.json>');

const secret = process.env.OPENMAIL_WEBHOOK_SECRET!;
const port = process.env.PORT ?? '3000';

const payload = JSON.parse(await readFile(file, 'utf8'));
payload.event_id = `evt_${randomUUID().slice(0, 8)}`;
if (payload.message) payload.message.id = `msg_${randomUUID().slice(0, 12)}`;

const body = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

const res = await fetch(`http://localhost:${port}/hooks/openmail`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Timestamp': timestamp,
    'X-Signature': signature,
    'X-Event-Id': payload.event_id,
  },
  body,
});

console.log(`${res.status} ${await res.text()} (message ${payload.message?.id})`);
