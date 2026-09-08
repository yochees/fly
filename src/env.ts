import { AsyncLocalStorage } from 'node:async_hooks';

export type Env = {
  DB: D1Database;
  FILES: R2Bucket;
  JOBS: Queue<unknown>;

  // secrets, set with: wrangler secret put <NAME>
  OPENMAIL_API_KEY: string;
  OPENMAIL_INBOX_ID: string;
  OPENMAIL_WEBHOOK_SECRET: string;
  OPENAI_API_KEY: string;
  ADMIN_TOKEN: string;

  // plain values from wrangler.jsonc
  PUBLIC_BASE_URL: string;
  OPENMAIL_INBOX_ADDRESS: string;
  MODEL_FAST: string;
  MODEL_STRONG: string;
  CONFIDENCE_THRESHOLD: string;
  SEND_CONFIRMATION: string;
};

type Ctx = { env: Env; ctx: ExecutionContext };

/**
 * A Worker has no module level singletons that can hold bindings: they arrive
 * with each request. This carries them through the call tree so the pipeline
 * code reads the same as it did on Node.
 */
const store = new AsyncLocalStorage<Ctx>();

export function withEnv<T>(env: Env, ctx: ExecutionContext, fn: () => T): T {
  return store.run({ env, ctx }, fn);
}

export function env(): Env {
  const current = store.getStore();
  if (!current) throw new Error('no request context: called outside withEnv()');
  return current.env;
}

export function waitUntil(promise: Promise<unknown>): void {
  store.getStore()?.ctx.waitUntil(promise);
}
