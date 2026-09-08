import { Hono } from 'hono';
import { verifySignature, type MessageReceived } from '../lib/openmail.ts';
import { storeInbound } from '../pipeline/store.ts';

export const webhook = new Hono();

/**
 * OpenMail gives up after 15 seconds, so this route only stores and queues.
 * All slow work happens in the worker.
 */
webhook.post('/hooks/openmail', async (c) => {
  const raw = await c.req.text();
  const timestamp = c.req.header('X-Timestamp') ?? '';
  const signature = c.req.header('X-Signature') ?? '';

  if (!verifySignature(raw, timestamp, signature)) return c.text('bad signature', 400);

  const event = JSON.parse(raw) as MessageReceived;
  if (event.event !== 'message.received') {
    console.log(`[fly] ignoring event ${event.event}`);
    return c.text('ok', 200);
  }

  const headers = Object.fromEntries(c.req.raw.headers) as Record<string, string>;
  await storeInbound(raw, headers);
  return c.text('ok', 200);
});
