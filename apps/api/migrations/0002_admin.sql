CREATE TABLE IF NOT EXISTS workspace_settings (
 id INTEGER PRIMARY KEY CHECK(id = 1),
 name TEXT NOT NULL DEFAULT 'SWANYO 工作区',
 accepting_tasks INTEGER NOT NULL DEFAULT 1 CHECK(accepting_tasks IN (0,1)),
 queue_enabled INTEGER NOT NULL DEFAULT 1 CHECK(queue_enabled IN (0,1)),
 version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL
);
INSERT OR IGNORE INTO workspace_settings(id,updated_at) VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE IF NOT EXISTS admin_events (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS background_jobs (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind = 'database_check'),
 status TEXT NOT NULL CHECK(status IN ('queued','running','succeeded','failed','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT,
 lease_until INTEGER,
 available_at INTEGER NOT NULL,
 result_json TEXT,
 last_error TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_ready ON background_jobs(status,available_at);
CREATE INDEX IF NOT EXISTS admin_events_recent ON admin_events(created_at DESC,id DESC);
