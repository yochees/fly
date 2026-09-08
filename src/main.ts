import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { config } from './config.ts';
import { migrate } from './db/migrate.ts';
import { startWorker } from './queue.ts';
import { processEmail } from './pipeline/process-email.ts';
import { webhook } from './routes/webhook.ts';
import { tripRoutes } from './routes/trip.ts';
import { admin } from './routes/admin.ts';

await migrate();

const app = new Hono();
app.get('/health', (c) => c.json({ ok: true }));
app.route('/', webhook);
app.route('/', admin);
app.route('/', tripRoutes);
app.get('/', (c) => c.text(`Forward a ticket to ${config.openmail.inboxAddress} and you get a link back.`));

// One process holds the web server and the worker, which is why SQLite fits.
startWorker({ 'process-email': ({ emailId }) => processEmail(emailId) });

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[venga] listening on http://localhost:${info.port}`);
  console.log(`[venga] admin: http://localhost:${info.port}/admin?token=${config.adminToken}`);
});
