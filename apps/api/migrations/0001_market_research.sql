PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS research_tasks (
  id TEXT PRIMARY KEY,
  request_key TEXT NOT NULL UNIQUE,
  request_body TEXT NOT NULL,
  prompt TEXT NOT NULL,
  brief_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('needs_clarification','blocked_configuration','cancelled')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS research_tasks_recent ON research_tasks(created_at DESC);
CREATE TABLE IF NOT EXISTS research_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES research_tasks(id),
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS research_events_task ON research_events(task_id, created_at);
