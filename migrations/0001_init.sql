-- fly, initial schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  event_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  rfc_message_id TEXT,
  thread_id TEXT,
  inbox_id TEXT,
  from_addr TEXT NOT NULL,
  to_addr TEXT,
  cc_addrs TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TEXT,
  payload TEXT NOT NULL,
  headers TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS emails_message_id_idx ON emails(message_id);
CREATE INDEX IF NOT EXISTS emails_user_idx ON emails(user_id);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL REFERENCES emails(id),
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  extraction_method TEXT,
  parsed_text TEXT,
  storage_key TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS attachments_email_idx ON attachments(email_id);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  slug TEXT NOT NULL UNIQUE,
  private_key TEXT,
  title TEXT,
  start_date TEXT,
  end_date TEXT,
  booking_refs TEXT,
  thread_ids TEXT,
  confidence REAL,
  needs_review INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS trips_user_idx ON trips(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS trips_private_key_idx ON trips(private_key);

CREATE TABLE IF NOT EXISTS trip_slugs (
  slug TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS segments (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  source_email_id TEXT REFERENCES emails(id),
  dedupe_key TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'flight',
  carrier TEXT,
  carrier_name TEXT,
  number TEXT,
  booking_ref TEXT,
  address TEXT,
  from_code TEXT,
  from_city TEXT,
  to_code TEXT,
  to_city TEXT,
  depart_local TEXT,
  depart_tz TEXT,
  arrive_local TEXT,
  arrive_tz TEXT,
  cabin TEXT,
  seat TEXT,
  passengers TEXT,
  raw TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS segments_trip_idx ON segments(trip_id);
CREATE UNIQUE INDEX IF NOT EXISTS segments_dedupe_idx ON segments(trip_id, dedupe_key);

CREATE TABLE IF NOT EXISTS parse_runs (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL REFERENCES emails(id),
  stage TEXT NOT NULL,
  model TEXT NOT NULL,
  request TEXT,
  response TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,
  duration_ms INTEGER,
  error TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS parse_runs_email_idx ON parse_runs(email_id);
