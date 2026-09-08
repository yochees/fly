import { Hono } from 'hono';
import { withEnv, type Env } from './env.ts';
import { config } from './config.ts';
import { processEmail } from './pipeline/process-email.ts';
import { webhook } from './routes/webhook.ts';
import { tripRoutes } from './routes/trip.ts';
import { admin } from './routes/admin.ts';
import { homePage } from './views/home.ts';
import type { Job } from './queue.ts';

const app = new Hono();
app.get('/health', (c) => c.json({ ok: true }));
app.route('/', webhook);
app.route('/', admin);
app.route('/', tripRoutes);
app.get('/', (c) => c.html(homePage()));

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return withEnv(env, ctx, () => app.fetch(request, env, ctx));
  },

  /**
   * The parse runs here, not in the request. OpenMail wants a 2xx inside 15
   * seconds and a model call can take twenty, so the webhook only enqueues.
   * Queues owns the retries; throwing puts the message back.
   */
  async queue(batch: MessageBatch<Job>, env: Env, ctx: ExecutionContext) {
    for (const message of batch.messages) {
      try {
        await withEnv(env, ctx, () => processEmail(message.body.emailId));
        message.ack();
      } catch (err) {
        console.error(`[fly] job failed for ${message.body.emailId}:`, err);
        message.retry();
      }
    }
  },
};
