import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { emails, attachments, users } from '../db/schema.ts';
import { newId } from '../lib/ids.ts';
import type { MessageReceived } from '../lib/openmail.ts';
import { enqueue } from '../queue.ts';

/**
 * Writes one inbound event and queues the parse. Shared by the live webhook
 * and by the backfill script, so both store exactly the same shape.
 * Returns null when the message is already known (retries are normal).
 */
export async function storeInbound(
  raw: string,
  headers: Record<string, string>,
  opts: { queue?: boolean } = {},
): Promise<string | null> {
  const event = JSON.parse(raw) as MessageReceived;
  const msg = event.message;

  const [seen] = await db.select({ id: emails.id }).from(emails).where(eq(emails.messageId, msg.id));
  if (seen) return null;

  const address = msg.from.toLowerCase().trim();
  let [user] = await db.select().from(users).where(eq(users.email, address));
  if (!user) {
    const id = newId('usr');
    await db.insert(users).values({ id, email: address });
    [user] = await db.select().from(users).where(eq(users.id, id));
  }

  const emailId = newId('eml');
  await db.insert(emails).values({
    id: emailId,
    userId: user.id,
    eventId: headers['x-event-id'] || event.event_id,
    messageId: msg.id,
    rfcMessageId: msg.rfc_message_id ?? null,
    threadId: event.thread_id ?? null,
    inboxId: event.inbox_id ?? null,
    fromAddr: address,
    toAddr: msg.to ?? null,
    ccAddrs: JSON.stringify(msg.cc ?? []),
    subject: msg.subject ?? null,
    bodyText: msg.body_text ?? null,
    bodyHtml: msg.body_html ?? null,
    receivedAt: msg.received_at ?? event.occurred_at ?? null,
    payload: raw,
    headers: JSON.stringify(headers),
  });

  // Mail clients repeat an attachment once per body part. Keep one of each.
  const seenFiles = new Set<string>();
  for (const a of msg.attachments ?? []) {
    const key = `${a.filename}|${a.sizeBytes ?? 0}`;
    if (seenFiles.has(key)) continue;
    seenFiles.add(key);
    await db.insert(attachments).values({
      id: newId('att'),
      emailId,
      filename: a.filename,
      contentType: a.contentType ?? null,
      sizeBytes: a.sizeBytes ?? null,
      extractionMethod: a.extractionMethod ?? null,
      parsedText: a.parsedText ?? null,
    });
  }

  // The backfill script parses inline, so it asks for no job.
  if (opts.queue !== false) await enqueue('process-email', { emailId });
  return emailId;
}
