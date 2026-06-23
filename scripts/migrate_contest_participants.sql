-- Migration: Add contest_participants table for contest access control
CREATE TABLE IF NOT EXISTS contest_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contest_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE (contest_id, user_id),
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cp_contest ON contest_participants (contest_id);
CREATE INDEX IF NOT EXISTS idx_cp_user ON contest_participants (user_id);
