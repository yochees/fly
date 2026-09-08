import { and, isNull, lte, eq, sql } from 'drizzle-orm';
import { db } from './db/index.ts';
import { jobs } from './db/schema.ts';
import { newId } from './lib/ids.ts';

/** Backoff copies OpenMail's own: 30s, 60s, 2m, 4m, then give up. */
const BACKOFF_MS = [30_000, 60_000, 120_000, 240_000];

export async function enqueue(kind: string, payload: unknown, delayMs = 0): Promise<string> {
  const id = newId('job');
  await db.insert(jobs).values({
    id,
    kind,
    payload: JSON.stringify(payload),
    runAt: new Date(Date.now() + delayMs).toISOString(),
  });
  return id;
}

type Handler = (payload: any) => Promise<void>;

export function startWorker(handlers: Record<string, Handler>, intervalMs = 2000) {
  let stopped = false;

  async function tick() {
    const now = new Date().toISOString();
    const due = await db
      .select()
      .from(jobs)
      .where(and(isNull(jobs.doneAt), isNull(jobs.lockedAt), lte(jobs.runAt, now)))
      .limit(5);

    for (const job of due) {
      // One process owns the database, so a claim is a plain conditional update.
      const claimed = await db
        .update(jobs)
        .set({ lockedAt: new Date().toISOString(), attempts: sql`${jobs.attempts} + 1` })
        .where(and(eq(jobs.id, job.id), isNull(jobs.lockedAt)))
        .returning({ id: jobs.id });
      if (!claimed.length) continue;

      const handler = handlers[job.kind];
      try {
        if (!handler) throw new Error(`no handler for job kind ${job.kind}`);
        await handler(JSON.parse(job.payload));
        await db.update(jobs).set({ doneAt: new Date().toISOString(), lockedAt: null, error: null }).where(eq(jobs.id, job.id));
      } catch (err) {
        const attempts = job.attempts + 1;
        const message = (err as Error).stack ?? String(err);
        console.error(`[fly] job ${job.kind} failed (attempt ${attempts}):`, message);
        if (attempts >= job.maxAttempts) {
          await db.update(jobs).set({ doneAt: new Date().toISOString(), lockedAt: null, error: message }).where(eq(jobs.id, job.id));
        } else {
          const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)];
          await db.update(jobs).set({
            lockedAt: null,
            error: message,
            runAt: new Date(Date.now() + delay).toISOString(),
          }).where(eq(jobs.id, job.id));
        }
      }
    }
  }

  const loop = async () => {
    while (!stopped) {
      try { await tick(); } catch (err) { console.error('[fly] worker tick failed:', err); }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  };
  void loop();

  return () => { stopped = true; };
}
