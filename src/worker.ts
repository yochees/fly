import { Hono } from 'hono';
import { withEnv, type Env } from './env.ts';
import { processEmail } from './pipeline/process-email.ts';
import { webhook } from './routes/webhook.ts';
import { tripRoutes, } from './routes/trip.ts';
import { admin } from './routes/admin.ts';
import { homePage } from './views/home.ts';
import { privacyPage } from './views/privacy.ts';
import { ogPage } from './views/og.ts';
import { ogPngBytes } from './og-image.ts';
import { tripIcs, flightIcsFiles } from './views/trip.ts';
import { sampleTrip, sampleSegments } from './views/sample.ts';
import { zip } from './lib/zip.ts';
import type { Job } from './queue.ts';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true }));
app.get('/privacy', (c) => c.html(privacyPage()));
app.get('/og', (c) => c.html(ogPage(Number(c.req.query('scale') ?? 1))));
app.get('/og.png', () => new Response(ogPngBytes().buffer as ArrayBuffer, {
  headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
}));

/**
 * The demo's calendar files, built by the same code as a real trip's.
 * Registered before the trip routes: `sample.ics` also matches a slug.
 */
app.get('/sample.ics', (c) => {
  const view = c.req.query('view') === 'public' ? 'public' : 'private';

  if (c.req.query('mode') === 'flights') {
    const files = flightIcsFiles(sampleTrip, sampleSegments as never, view);
    const body = zip(files.map((f) => ({ name: f.name, data: f.data })));
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(body.length),
        'Content-Disposition': 'attachment; filename="sample-bookings.zip"',
      },
    });
  }

  return new Response(tripIcs(sampleTrip, sampleSegments as never, view, 'trip'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sample-trip.ics"',
    },
  });
});

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
   * Queues owns the retries; a retry puts the message back.
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
