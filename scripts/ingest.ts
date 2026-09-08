/**
 * Pulls messages that are already in the OpenMail inbox and runs them through
 * the normal pipeline. Use it for mail that arrived before the webhook existed.
 *
 *   npm run ingest            # every message in the inbox
 *   npm run ingest <msgId>    # one message
 */
/**
 * Runs on your machine, not in the Worker: it reads the inbox over the API and
 * posts each message to the deployed webhook, signed the way OpenMail signs it.
 *
 *   OPENMAIL_API_KEY=... OPENMAIL_INBOX_ID=... OPENMAIL_WEBHOOK_SECRET=... \
 *   BASE=https://fly.diz.lt node scripts/ingest.ts
 */
import { createHmac } from 'node:crypto';

const API = 'https://api.openmail.sh';
const key = process.env.OPENMAIL_API_KEY!;
const inbox = process.env.OPENMAIL_INBOX_ID!;
const secret = process.env.OPENMAIL_WEBHOOK_SECRET!;
const base = process.env.BASE ?? 'http://localhost:8787';

const only = process.argv[2];
const res = await fetch(`${API}/v1/inboxes/${inbox}/messages?limit=50`, {
  headers: { Authorization: `Bearer ${key}` },
});
if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);

const { data } = (await res.json()) as { data: any[] };
const inbound = data.filter((m) => m.direction === 'inbound' && (!only || m.id === only));
console.log(`found ${inbound.length} inbound message(s)`);

for (const m of inbound) {
  // Same shape the webhook delivers, so the stored payload is identical.
  const payload = {
    event: 'message.received',
    event_id: `backfill_${m.id}`,
    occurred_at: m.createdAt,
    inbox_id: m.inboxId ?? inbox,
    thread_id: m.threadId,
    message: {
      id: m.id,
      rfc_message_id: m.rfcMessageId,
      from: m.fromAddr,
      to: m.toAddr,
      cc: m.cc ?? [],
      subject: m.subject,
      body_text: m.bodyText,
      body_html: m.bodyHtml,
      attachments: m.attachments ?? [],
      received_at: m.createdAt,
    },
  };

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const post = await fetch(`${base}/hooks/openmail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'X-Event-Id': payload.event_id,
    },
    body,
  });
  console.log(`${m.id}: ${post.status} ${await post.text()}`);
}
