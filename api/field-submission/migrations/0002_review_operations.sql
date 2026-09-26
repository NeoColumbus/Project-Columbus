ALTER TABLE submissions ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
CREATE TABLE review_audit (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  reason TEXT NOT NULL,
  previous_fingerprint TEXT NOT NULL,
  next_fingerprint TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  next_status TEXT NOT NULL,
  revision INTEGER NOT NULL
);
CREATE TABLE operation_health (name TEXT PRIMARY KEY, last_success TEXT NOT NULL);
