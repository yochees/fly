import { and, eq, gte, lte, or, desc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { trips, segments, tripSlugs } from '../db/schema.ts';
import { newId } from '../lib/ids.ts';
import { newSlug } from '../lib/slug.ts';
import type { Extracted, ExtractedSegment } from './schema.ts';
import type { TripCandidate } from './extract.ts';

const DAY = 86_400_000;
const WINDOW_DAYS = 21;

const dateOf = (local: string | null) => (local ? local.slice(0, 10) : null);
const json = (v: unknown) => JSON.stringify(v ?? []);
const parse = <T>(v: string | null, fallback: T): T => {
  try { return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};

export function dedupeKey(s: ExtractedSegment): string {
  return [s.kind, s.carrier ?? s.carrier_name ?? '?', s.number ?? '?', dateOf(s.depart_local) ?? '?', s.from_code ?? '?']
    .join('|')
    .toLowerCase();
}

/** Trips of this sender that could be the same journey, by date window. */
export async function findCandidates(userId: string, extractedSegments: ExtractedSegment[]): Promise<TripCandidate[]> {
  const dates = extractedSegments.map((s) => dateOf(s.depart_local)).filter(Boolean) as string[];
  let where = eq(trips.userId, userId);

  if (dates.length) {
    const min = new Date(`${dates.sort()[0]}T00:00:00Z`).getTime() - WINDOW_DAYS * DAY;
    const max = new Date(`${dates[dates.length - 1]}T00:00:00Z`).getTime() + WINDOW_DAYS * DAY;
    where = and(
      eq(trips.userId, userId),
      or(
        and(gte(trips.endDate, new Date(min).toISOString().slice(0, 10)), lte(trips.startDate, new Date(max).toISOString().slice(0, 10))),
        eq(trips.startDate, dates[0]),
      ),
    )!;
  }

  const rows = await db.select().from(trips).where(where).orderBy(desc(trips.updatedAt)).limit(20);

  const out: TripCandidate[] = [];
  for (const t of rows) {
    const segs = await db.select().from(segments).where(eq(segments.tripId, t.id));
    const route = segs.map((s) => `${s.fromCode ?? '?'}>${s.toCode ?? '?'} ${s.departLocal ?? ''}`).join(', ');
    out.push({ id: t.id, title: t.title, startDate: t.startDate, endDate: t.endDate, route, bookingRefs: parse<string[]>(t.bookingRefs, []) });
  }
  return out;
}

/**
 * Deterministic first, model second. A thread or a booking reference is proof;
 * the model only decides when nothing matches on its own.
 */
export async function pickTarget(
  userId: string,
  result: Extracted,
  candidates: TripCandidate[],
  threadId: string | null,
): Promise<{ tripId: string | null; reason: string }> {
  if (threadId) {
    const rows = await db.select().from(trips).where(eq(trips.userId, userId));
    const hit = rows.find((t) => parse<string[]>(t.threadIds, []).includes(threadId));
    if (hit) return { tripId: hit.id, reason: 'same email thread' };
  }

  const refs = result.segments.map((s) => s.booking_ref).filter(Boolean) as string[];
  if (refs.length) {
    const hit = candidates.find((c) => c.bookingRefs.some((r) => refs.includes(r)));
    if (hit) return { tripId: hit.id, reason: 'same booking reference' };
  }

  if (result.merge_with_trip_id && candidates.some((c) => c.id === result.merge_with_trip_id)) {
    return { tripId: result.merge_with_trip_id, reason: result.merge_reason ?? 'model decision' };
  }

  return { tripId: null, reason: 'no match, new trip' };
}

async function uniquePrivateKey(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const key = newSlug(16);
    const [taken] = await db.select({ id: trips.id }).from(trips).where(eq(trips.privateKey, key));
    if (!taken) return key;
  }
  return newSlug(20);
}

async function uniqueSlug(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const slug = newSlug();
    const [taken] = await db.select({ slug: trips.slug }).from(trips).where(eq(trips.slug, slug));
    if (!taken) return slug;
  }
  return newSlug(8);
}

export async function applyResult(opts: {
  userId: string;
  emailId: string;
  threadId: string | null;
  result: Extracted;
  targetTripId: string | null;
}): Promise<{ tripId: string; slug: string; privateKey: string; created: boolean; addedSegments: number }> {
  const { userId, emailId, threadId, result } = opts;
  let tripId = opts.targetTripId;
  let created = false;
  let slug: string;
  let privateKey: string;

  if (tripId) {
    const [t] = await db.select().from(trips).where(eq(trips.id, tripId));
    slug = t.slug;
    privateKey = t.privateKey;
  } else {
    tripId = newId('trip');
    slug = await uniqueSlug();
    privateKey = await uniquePrivateKey();
    created = true;
    await db.insert(trips).values({
      id: tripId,
      userId,
      slug,
      privateKey,
      title: result.trip_title,
      bookingRefs: json([]),
      threadIds: json([]),
      confidence: result.confidence,
      needsReview: result.needs_review,
    });
    await db.insert(tripSlugs).values({ slug, tripId });
  }

  let added = 0;
  for (const s of result.segments) {
    const key = dedupeKey(s);
    const [existing] = await db.select().from(segments).where(and(eq(segments.tripId, tripId), eq(segments.dedupeKey, key)));
    const values = {
      tripId,
      sourceEmailId: emailId,
      dedupeKey: key,
      kind: s.kind,
      carrier: s.carrier,
      carrierName: s.carrier_name,
      number: s.number,
      bookingRef: s.booking_ref,
      address: s.address,
      fromCode: s.from_code,
      fromCity: s.from_city,
      toCode: s.to_code,
      toCity: s.to_city,
      departLocal: s.depart_local,
      departTz: s.depart_tz,
      arriveLocal: s.arrive_local,
      arriveTz: s.arrive_tz,
      cabin: s.cabin,
      seat: s.seat,
      passengers: json(s.passengers),
      raw: JSON.stringify(s),
      updatedAt: new Date().toISOString(),
    };
    if (existing) {
      // A later email usually knows more (seat, gate, terminal). Keep what is set.
      await db.update(segments).set(values).where(eq(segments.id, existing.id));
    } else {
      await db.insert(segments).values({ id: newId('seg'), ...values });
      added++;
    }
  }

  // Recompute the trip summary from every segment it now holds.
  const all = await db.select().from(segments).where(eq(segments.tripId, tripId));
  const dates = all.map((s) => dateOf(s.departLocal)).filter(Boolean).sort() as string[];
  const [t] = await db.select().from(trips).where(eq(trips.id, tripId));
  const refs = new Set(parse<string[]>(t.bookingRefs, []));
  for (const s of all) if (s.bookingRef) refs.add(s.bookingRef);
  const threadIds = new Set(parse<string[]>(t.threadIds, []));
  if (threadId) threadIds.add(threadId);

  const first = all.find((s) => dateOf(s.departLocal) === dates[0]);
  const title = t.title ?? result.trip_title ?? (first ? `${first.fromCity ?? first.fromCode} to ${first.toCity ?? first.toCode}` : null);

  await db.update(trips).set({
    title,
    startDate: dates[0] ?? null,
    endDate: dates[dates.length - 1] ?? null,
    bookingRefs: json([...refs]),
    threadIds: json([...threadIds]),
    confidence: result.confidence,
    needsReview: result.needs_review || t.needsReview,
    updatedAt: new Date().toISOString(),
  }).where(eq(trips.id, tripId));

  return { tripId, slug, privateKey, created, addedSegments: added };
}
