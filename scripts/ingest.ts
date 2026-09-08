/**
 * Pulls messages that are already in the OpenMail inbox and runs them through
 * the normal pipeline. Use it for mail that arrived before the webhook existed.
 *
 *   npm run ingest            # every message in the inbox
 *   npm run ingest <msgId>    # one message
 */
import { config } from '../src/config.ts';
import { migrate } from '../src/db/migrate.ts';
import { storeInbound } from '../src/pipeline/store.ts';
import { processEmail } from '../src/pipeline/process-email.ts';

await migrate();

const only = process.argv[2];
const res = await fetch(`${config.openmail.baseUrl}/v1/inboxes/${config.openmail.inboxId}/messages?limit=50`, {
  headers: { Authorization: `Bearer ${config.openmail.apiKey}` },
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
    inbox_id: m.inboxId ?? config.openmail.inboxId,
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

  const emailId = await storeInbound(JSON.stringify(payload), { 'x-source': 'backfill' }, { queue: false });
  if (!emailId) { console.log(`${m.id}: already stored, skipped`); continue; }
  console.log(`${m.id}: stored as ${emailId}, parsing...`);
  await processEmail(emailId);
}

process.exit(0);
