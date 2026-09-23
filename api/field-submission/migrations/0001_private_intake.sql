CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  report TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('candidate','quarantine','approved','published')),
  flags TEXT NOT NULL,
  screening_version TEXT NOT NULL,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  reviewed_at TEXT,
  reviewer TEXT,
  publication_state TEXT NOT NULL DEFAULT 'pending' CHECK (publication_state IN ('pending','sending','uncertain','complete')),
  issue_url TEXT
);
CREATE INDEX IF NOT EXISTS submissions_status ON submissions(status, created_at);
CREATE TABLE IF NOT EXISTS intake_counts (day TEXT NOT NULL, outcome TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day, outcome));
