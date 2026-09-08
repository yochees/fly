import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

const now = () => new Date().toISOString();

/** One row per forwarding email address. Identity is the sender address. */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),          // lowercased
  createdAt: text('created_at').notNull().$defaultFn(now),
});

/**
 * Everything OpenMail sent us, kept whole for debugging.
 * payload holds the raw webhook JSON, headers holds the HTTP headers.
 */
export const emails = sqliteTable('emails', {
  id: text('id').primaryKey(),                      // our id
  userId: text('user_id').references(() => users.id),
  eventId: text('event_id').notNull(),              // X-Event-Id, retries repeat it
  messageId: text('message_id').notNull(),          // OpenMail message.id
  rfcMessageId: text('rfc_message_id'),
  threadId: text('thread_id'),
  inboxId: text('inbox_id'),
  fromAddr: text('from_addr').notNull(),
  toAddr: text('to_addr'),
  ccAddrs: text('cc_addrs'),                        // JSON array
  subject: text('subject'),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  receivedAt: text('received_at'),
  payload: text('payload').notNull(),               // raw webhook JSON, verbatim
  headers: text('headers'),                         // JSON object
  status: text('status').notNull().default('queued'), // queued|parsed|failed|ignored
  error: text('error'),
  createdAt: text('created_at').notNull().$defaultFn(now),
}, (t) => ({
  byMessage: uniqueIndex('emails_message_id_idx').on(t.messageId),
  byUser: index('emails_user_idx').on(t.userId),
}));

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  emailId: text('email_id').notNull().references(() => emails.id),
  filename: text('filename').notNull(),
  contentType: text('content_type'),
  sizeBytes: integer('size_bytes'),
  extractionMethod: text('extraction_method'),      // pdf|ocr|office|csv|text|unsupported|...
  parsedText: text('parsed_text'),
  storageKey: text('storage_key'),                  // local copy, null if not downloaded
  createdAt: text('created_at').notNull().$defaultFn(now),
}, (t) => ({ byEmail: index('attachments_email_idx').on(t.emailId) }));

export const trips = sqliteTable('trips', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  slug: text('slug').notNull().unique(),
  title: text('title'),
  startDate: text('start_date'),                    // YYYY-MM-DD, earliest segment
  endDate: text('end_date'),
  bookingRefs: text('booking_refs'),                // JSON array, for matching
  threadIds: text('thread_ids'),                    // JSON array, for matching
  confidence: real('confidence'),
  needsReview: integer('needs_review', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
}, (t) => ({ byUser: index('trips_user_idx').on(t.userId) }));

/** Old slugs stay alive after a rename, so shared links never break. */
export const tripSlugs = sqliteTable('trip_slugs', {
  slug: text('slug').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id),
  createdAt: text('created_at').notNull().$defaultFn(now),
});

export const segments = sqliteTable('segments', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id),
  sourceEmailId: text('source_email_id').references(() => emails.id),
  dedupeKey: text('dedupe_key').notNull(),          // carrier|number|date|origin
  kind: text('kind').notNull().default('flight'),   // flight|train|hotel|car|other
  carrier: text('carrier'),
  carrierName: text('carrier_name'),
  number: text('number'),
  bookingRef: text('booking_ref'),
  fromCode: text('from_code'),
  fromCity: text('from_city'),
  toCode: text('to_code'),
  toCity: text('to_city'),
  departLocal: text('depart_local'),                // YYYY-MM-DDTHH:MM, local to origin
  departTz: text('depart_tz'),
  arriveLocal: text('arrive_local'),
  arriveTz: text('arrive_tz'),
  cabin: text('cabin'),
  seat: text('seat'),
  passengers: text('passengers'),                   // JSON array
  raw: text('raw'),                                 // JSON, what the model returned
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
}, (t) => ({
  byTrip: index('segments_trip_idx').on(t.tripId),
  uniqueInTrip: uniqueIndex('segments_dedupe_idx').on(t.tripId, t.dedupeKey),
}));

/** One row per LLM call. Full request and response, for debugging and cost. */
export const parseRuns = sqliteTable('parse_runs', {
  id: text('id').primaryKey(),
  emailId: text('email_id').notNull().references(() => emails.id),
  stage: text('stage').notNull(),                   // extract|escalate|merge
  model: text('model').notNull(),
  request: text('request'),
  response: text('response'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  costUsd: real('cost_usd'),
  durationMs: integer('duration_ms'),
  error: text('error'),
  createdAt: text('created_at').notNull().$defaultFn(now),
}, (t) => ({ byEmail: index('parse_runs_email_idx').on(t.emailId) }));

/** Job queue. One table, polled by the worker in the same process. */
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  payload: text('payload').notNull(),
  runAt: text('run_at').notNull().$defaultFn(now),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  lockedAt: text('locked_at'),
  doneAt: text('done_at'),
  error: text('error'),
  createdAt: text('created_at').notNull().$defaultFn(now),
}, (t) => ({ byRunAt: index('jobs_run_at_idx').on(t.runAt) }));
