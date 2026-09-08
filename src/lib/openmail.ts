import { createHmac, timingSafeEqual } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';

export type OpenMailAttachment = {
  filename: string;
  contentType?: string;
  sizeBytes?: number;
  url?: string;
  parsedText?: string;
  extractionMethod?: string;
};

export type MessageReceived = {
  event: 'message.received';
  event_id: string;
  occurred_at: string;
  inbox_id: string;
  thread_id: string;
  message: {
    id: string;
    rfc_message_id?: string;
    from: string;
    to?: string;
    cc?: string[];
    subject?: string;
    body_text?: string;
    body_html?: string;
    attachments?: OpenMailAttachment[];
    received_at?: string;
  };
};

/**
 * Signature is HMAC-SHA256 over "{timestamp}.{raw body}", hex.
 * The raw body must be the bytes as received, not re-serialised JSON.
 */
export function verifySignature(rawBody: string, timestamp: string, signature: string): boolean {
  if (!timestamp || !signature) return false;
  const skew = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(skew) || skew > 300) return false;      // 5 minute replay window
  const expected = createHmac('sha256', config.openmail.webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${config.openmail.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.openmail.apiKey}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`OpenMail ${path} failed: ${res.status} ${await res.text()}`);
  return res;
}

/** Attachment URLs return the bytes directly, with the same bearer key. */
export async function downloadAttachment(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${config.openmail.apiKey}` } });
  if (!res.ok) throw new Error(`attachment download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Reply inside the same thread, so a later ticket for the same trip stays linked. */
export async function reply(to: string, threadId: string | null, body: string, subject?: string): Promise<void> {
  await api(`/v1/inboxes/${config.openmail.inboxId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
    // The API wants a recipient even on a thread reply.
    body: JSON.stringify({ to, threadId: threadId ?? undefined, subject, body }),
  });
}

export async function getThreadMessages(threadId: string): Promise<unknown> {
  return (await api(`/v1/threads/${threadId}/messages`)).json();
}
