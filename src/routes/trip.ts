import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { trips, segments, tripSlugs } from '../db/schema.ts';
import { normaliseSlug, isValidSlug } from '../lib/slug.ts';
import { tripPage, tripIcs } from '../views/trip.ts';

export const tripRoutes = new Hono();

async function load(slugRaw: string) {
  const slug = normaliseSlug(slugRaw);
  if (!isValidSlug(slug)) return null;

  let [trip] = await db.select().from(trips).where(eq(trips.slug, slug));
  if (!trip) {
    // An old slug after a rename still resolves, so shared links keep working.
    const [old] = await db.select().from(tripSlugs).where(eq(tripSlugs.slug, slug));
    if (!old) return null;
    [trip] = await db.select().from(trips).where(eq(trips.id, old.tripId));
    if (!trip) return null;
    return { trip, segs: [], redirectTo: trip.slug };
  }

  const segs = await db.select().from(segments).where(eq(segments.tripId, trip.id)).orderBy(asc(segments.departLocal));
  return { trip, segs, redirectTo: null as string | null };
}

tripRoutes.get('/:slug{[A-Za-z0-9]{4,16}}', async (c) => {
  const found = await load(c.req.param('slug'));
  if (!found) return c.text('Not found', 404);
  if (found.redirectTo) return c.redirect(`/${found.redirectTo}`, 301);
  return c.html(tripPage(found.trip, found.segs));
});

tripRoutes.get('/:slug{[A-Za-z0-9]{4,16}}.ics', async (c) => {
  const found = await load(c.req.param('slug'));
  if (!found || found.redirectTo) return c.text('Not found', 404);
  return new Response(tripIcs(found.trip, found.segs), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${found.trip.slug}.ics"`,
    },
  });
});
