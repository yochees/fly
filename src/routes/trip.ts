import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { trips, segments, tripSlugs } from '../db/schema.ts';
import { normaliseSlug, isValidSlug } from '../lib/slug.ts';
import { tripPage, tripIcs, type View, type IcsMode } from '../views/trip.ts';

export const tripRoutes = new Hono();

async function withSegments(trip: typeof trips.$inferSelect) {
  const segs = await db.select().from(segments).where(eq(segments.tripId, trip.id)).orderBy(asc(segments.departLocal));
  return { trip, segs };
}

/** Public page. The slug is short, so it holds nothing that names a person. */
async function loadPublic(slugRaw: string) {
  const slug = normaliseSlug(slugRaw);
  if (!isValidSlug(slug)) return null;

  const [trip] = await db.select().from(trips).where(eq(trips.slug, slug));
  if (trip) return { ...(await withSegments(trip)), redirectTo: null as string | null };

  // An old slug after a rename still resolves, so shared links keep working.
  const [old] = await db.select().from(tripSlugs).where(eq(tripSlugs.slug, slug));
  if (!old) return null;
  const [target] = await db.select().from(trips).where(eq(trips.id, old.tripId));
  return target ? { trip: target, segs: [], redirectTo: target.slug } : null;
}

/**
 * Owner page. The key is long enough not to be guessed. When Google and Apple
 * sign-in arrive, this route keeps its shape and the check becomes a session.
 */
async function loadPrivate(key: string) {
  if (!/^[A-Z0-9]{12,32}$/.test(key.toUpperCase())) return null;
  const [trip] = await db.select().from(trips).where(eq(trips.privateKey, key.toUpperCase()));
  return trip ? await withSegments(trip) : null;
}

tripRoutes.get('/t/:key{[A-Za-z0-9]{12,32}}', async (c) => {
  const found = await loadPrivate(c.req.param('key'));
  if (!found) return c.text('Not found', 404);
  c.header('X-Robots-Tag', 'noindex');
  return c.html(tripPage(found.trip, found.segs, 'private'));
});

// The extension belongs inside the pattern: a suffix after the closing brace
// is not part of the match, so these routes never fired.
tripRoutes.get('/t/:file{[A-Za-z0-9]{12,32}\\.ics}', async (c) => {
  const found = await loadPrivate(c.req.param('file').slice(0, -4));
  if (!found) return c.text('Not found', 404);
  return ics(c, found.trip, found.segs, 'private');
});

tripRoutes.get('/:slug{[A-Za-z0-9]{4,16}}', async (c) => {
  const found = await loadPublic(c.req.param('slug'));
  if (!found) return c.text('Not found', 404);
  if (found.redirectTo) return c.redirect(`/${found.redirectTo}`, 301);
  return c.html(tripPage(found.trip, found.segs, 'public'));
});

tripRoutes.get('/:file{[A-Za-z0-9]{4,16}\\.ics}', async (c) => {
  const found = await loadPublic(c.req.param('file').slice(0, -4));
  if (!found || found.redirectTo) return c.text('Not found', 404);
  return ics(c, found.trip, found.segs, 'public');
});

function ics(c: { req: { query: (k: string) => string | undefined } }, trip: typeof trips.$inferSelect, segs: (typeof segments.$inferSelect)[], view: View) {
  // One long event is the default; ?mode=flights gives one event per leg.
  const mode: IcsMode = c.req.query('mode') === 'flights' ? 'flights' : 'trip';
  return new Response(tripIcs(trip, segs, view, mode), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${trip.slug}.ics"`,
    },
  });
}
