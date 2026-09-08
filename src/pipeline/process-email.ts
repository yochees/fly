import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { emails, attachments, users, parseRuns } from '../db/schema.ts';
import { config } from '../config.ts';
import { newId } from '../lib/ids.ts';
import * as storage from '../lib/storage.ts';
import { downloadAttachment, reply } from '../lib/openmail.ts';
import { extract, shouldEscalate, type ExtractInput } from './extract.ts';
import { findCandidates, pickTarget, applyResult } from './merge.ts';

const DOWNLOAD_TYPES = /^(image\/|application\/pdf)/i;

async function record(emailId: string, stage: string, r: Awaited<ReturnType<typeof extract>>) {
  await db.insert(parseRuns).values({
    id: newId('run'),
    emailId,
    stage,
    model: r.model,
    request: JSON.stringify(r.request),
    response: JSON.stringify(r.response),
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    costUsd: r.costUsd,
    durationMs: r.durationMs,
  });
}

export async function processEmail(emailId: string): Promise<void> {
  const [email] = await db.select().from(emails).where(eq(emails.id, emailId));
  if (!email) throw new Error(`email ${emailId} not found`);

  const [user] = await db.select().from(users).where(eq(users.id, email.userId!));
  const atts = await db.select().from(attachments).where(eq(attachments.emailId, emailId));

  // Keep our own copy of anything the model may need to look at.
  const enriched = [];
  for (const a of atts) {
    let localPath = a.storageKey ? `${config.storageDir}/${a.storageKey}` : undefined;
    if (!localPath && DOWNLOAD_TYPES.test(a.contentType ?? '')) {
      const payload = JSON.parse(email.payload);
      const source = (payload.message?.attachments ?? []).find((x: any) => x.filename === a.filename);
      if (source?.url) {
        const bytes = await downloadAttachment(source.url);
        const key = `${emailId}/${storage.safeName(a.filename)}`;
        await storage.put(key, bytes);
        await db.update(attachments).set({ storageKey: key }).where(eq(attachments.id, a.id));
        localPath = `${config.storageDir}/${key}`;
      }
    }
    enriched.push({
      filename: a.filename,
      contentType: a.contentType ?? undefined,
      sizeBytes: a.sizeBytes ?? undefined,
      parsedText: a.parsedText ?? undefined,
      extractionMethod: a.extractionMethod ?? undefined,
      localPath,
    });
  }

  const input: ExtractInput = {
    from: email.fromAddr,
    subject: email.subject,
    bodyText: email.bodyText,
    receivedAt: email.receivedAt,
    attachments: enriched,
    candidates: [],
  };

  // First pass with the cheap model, only to learn the dates and places.
  let run = await extract(input, config.openai.fast);
  await record(emailId, 'extract', run);

  if (!run.data.is_travel) {
    await db.update(emails).set({ status: 'ignored', error: run.data.notes }).where(eq(emails.id, emailId));
    return;
  }

  // Now that we know the dates, load the sender's nearby trips and ask again
  // only if the answer was weak. The candidates also let the model merge.
  input.candidates = await findCandidates(user.id, run.data.segments);

  if (shouldEscalate(run.data, input) || input.candidates.length > 0) {
    const model = shouldEscalate(run.data, input) ? config.openai.strong : config.openai.fast;
    const second = await extract(input, model);
    await record(emailId, model === config.openai.strong ? 'escalate' : 'merge', second);
    if (second.data.is_travel) run = second;
  }

  const target = await pickTarget(user.id, run.data, input.candidates, email.threadId);
  const applied = await applyResult({
    userId: user.id,
    emailId,
    threadId: email.threadId,
    result: run.data,
    targetTripId: target.tripId,
  });

  await db.update(emails).set({ status: 'parsed', error: null }).where(eq(emails.id, emailId));

  const url = `${config.publicBaseUrl}/${applied.slug}`;
  console.log(`[fly] ${email.fromAddr} -> ${url} (${applied.created ? 'new' : 'updated'}, ${target.reason})`);

  if (config.sendConfirmation) {
    const body = applied.created
      ? `Your trip is ready:\n\n${url}\n\nForward the return ticket to this address and it joins the same page.`
      : `Trip updated:\n\n${url}`;
    try {
      await reply(email.fromAddr, email.threadId, body, `Your trip: ${applied.slug}`);
    } catch (err) {
      // A failed reply must not lose the trip. Send limits are 200 a day.
      console.warn('[fly] reply failed:', (err as Error).message);
    }
  }
}
