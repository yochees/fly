import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { emails, attachments, parseRuns, trips, segments, jobs } from '../db/schema.ts';
import { config } from '../config.ts';
import { page, esc } from '../views/html.ts';
import { enqueue } from '../queue.ts';

export const admin = new Hono();

/** One shared token. The pages show real mail, so nothing here is public. */
admin.use('/admin/*', async (c, next) => {
  const token = c.req.query('token') ?? c.req.header('X-Admin-Token') ?? '';
  if (token !== config.adminToken) return c.text('unauthorized', 401);
  await next();
});

const t = (v: string | null) => (v ? v.replace('T', ' ').slice(0, 16) : '');

admin.get('/admin', async (c) => {
  const token = c.req.query('token')!;
  const rows = await db.select().from(emails).orderBy(desc(emails.createdAt)).limit(100);
  const pending = await db.select().from(jobs).where(eq(jobs.kind, 'process-email')).orderBy(desc(jobs.createdAt)).limit(5);

  const body = `<h1>Inbox</h1>
<p class="sub">${rows.length} emails &middot; ${pending.filter((j) => !j.doneAt).length} jobs waiting</p>
<table><tr><th>When</th><th>From</th><th>Subject</th><th>Status</th><th></th></tr>
${rows.map((e) => `<tr>
  <td>${esc(t(e.createdAt))}</td><td>${esc(e.fromAddr)}</td><td>${esc(e.subject ?? '')}</td>
  <td>${esc(e.status)}${e.error ? ' &#9888;' : ''}</td>
  <td><a href="/admin/emails/${esc(e.id)}?token=${esc(token)}">open</a></td>
</tr>`).join('')}</table>`;
  return c.html(page('venga admin', body));
});

admin.get('/admin/emails/:id', async (c) => {
  const token = c.req.query('token')!;
  const id = c.req.param('id');
  const [email] = await db.select().from(emails).where(eq(emails.id, id));
  if (!email) return c.text('not found', 404);

  const atts = await db.select().from(attachments).where(eq(attachments.emailId, id));
  const runs = await db.select().from(parseRuns).where(eq(parseRuns.emailId, id)).orderBy(desc(parseRuns.createdAt));
  const segs = await db.select().from(segments).where(eq(segments.sourceEmailId, id));
  const trip = segs.length ? (await db.select().from(trips).where(eq(trips.id, segs[0].tripId)))[0] : null;

  const body = `<h1>${esc(email.subject ?? '(no subject)')}</h1>
<p class="sub">${esc(email.fromAddr)} &middot; ${esc(t(email.createdAt))} &middot; ${esc(email.status)}</p>

${trip ? `<p>Trip: <a href="/${esc(trip.slug)}">${esc(trip.slug)}</a> &middot; ${esc(trip.title ?? '')}</p>` : '<p>No trip made from this email.</p>'}
${email.error ? `<div class="flag">${esc(email.error)}</div>` : ''}

<p>
  <a href="/admin/emails/${esc(id)}/reparse?token=${esc(token)}&model=fast">parse again (fast)</a> &middot;
  <a href="/admin/emails/${esc(id)}/reparse?token=${esc(token)}&model=strong">parse again (strong)</a>
</p>

<h2>Identifiers</h2>
<table>
<tr><th>OpenMail message</th><td>${esc(email.messageId)}</td></tr>
<tr><th>RFC Message-ID</th><td>${esc(email.rfcMessageId ?? '')}</td></tr>
<tr><th>Thread</th><td>${esc(email.threadId ?? '')}</td></tr>
<tr><th>Event</th><td>${esc(email.eventId)}</td></tr>
</table>

<h2>Attachments</h2>
${atts.length ? `<table><tr><th>File</th><th>Type</th><th>Size</th><th>Extraction</th><th>Text</th></tr>
${atts.map((a) => `<tr><td>${esc(a.filename)}</td><td>${esc(a.contentType ?? '')}</td><td>${a.sizeBytes ?? ''}</td>
<td>${esc(a.extractionMethod ?? '')}</td><td>${esc((a.parsedText ?? '').slice(0, 300))}</td></tr>`).join('')}</table>` : '<p>None.</p>'}

<h2>Model runs</h2>
${runs.map((r) => `<h3>${esc(r.stage)} &middot; ${esc(r.model)} &middot; ${r.durationMs} ms &middot; $${(r.costUsd ?? 0).toFixed(4)}</h3>
<pre>${esc(JSON.stringify(JSON.parse(r.response ?? '{}'), null, 2))}</pre>`).join('') || '<p>None.</p>'}

<h2>Body</h2>
<pre>${esc((email.bodyText ?? '').slice(0, 8000))}</pre>

<h2>Raw webhook payload</h2>
<pre>${esc(JSON.stringify(JSON.parse(email.payload), null, 2).slice(0, 20000))}</pre>`;

  return c.html(page('email', body));
});

admin.get('/admin/emails/:id/reparse', async (c) => {
  const id = c.req.param('id');
  await enqueue('process-email', { emailId: id, force: c.req.query('model') ?? 'fast' });
  return c.redirect(`/admin/emails/${id}?token=${c.req.query('token')}`);
});

admin.get('/admin/trips', async (c) => {
  const rows = await db.select().from(trips).orderBy(desc(trips.updatedAt)).limit(100);
  const body = `<h1>Trips</h1><table><tr><th>Slug</th><th>Title</th><th>Dates</th><th>Review</th></tr>
${rows.map((t2) => `<tr><td><a href="/${esc(t2.slug)}">${esc(t2.slug)}</a></td><td>${esc(t2.title ?? '')}</td>
<td>${esc(t2.startDate ?? '')} ${esc(t2.endDate ?? '')}</td><td>${t2.needsReview ? 'yes' : ''}</td></tr>`).join('')}</table>`;
  return c.html(page('trips', body));
});
