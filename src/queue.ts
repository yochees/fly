import { env } from './env.ts';

export type Job = { kind: 'process-email'; emailId: string };

/**
 * Cloudflare Queues handles the retries and the backoff that the polling
 * loop used to do by hand, so this is now one call.
 */
export async function enqueue(kind: Job['kind'], payload: Omit<Job, 'kind'>): Promise<void> {
  await env().JOBS.send({ kind, ...payload });
}
