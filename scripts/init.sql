-- OJv3 SQLite Schema

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT DEFAULT '',
  role INTEGER DEFAULT 0,
  badge TEXT DEFAULT '',
  rating INTEGER DEFAULT 1500,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- 2. Problems
CREATE TABLE IF NOT EXISTS problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  input_format TEXT,
  output_format TEXT,
  sample_cases TEXT,
  time_limit INTEGER NOT NULL,
  memory_limit INTEGER NOT NULL,
  difficulty INTEGER DEFAULT 1,
  is_public INTEGER DEFAULT 1,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_public ON problems (is_public);

-- 3. Records
CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  problem_id INTEGER NOT NULL,
  contest_id INTEGER DEFAULT 0,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  status INTEGER DEFAULT 0,
  time_used INTEGER DEFAULT 0,
  memory_used INTEGER DEFAULT 0,
  error_info TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records (user_id);
CREATE INDEX IF NOT EXISTS idx_records_problem_id ON records (problem_id);
CREATE INDEX IF NOT EXISTS idx_records_contest_id ON records (contest_id);

-- 4. Contests
CREATE TABLE IF NOT EXISTS contests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  type INTEGER DEFAULT 0,
  password TEXT DEFAULT '',
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Contest_Problems
CREATE TABLE IF NOT EXISTS contest_problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contest_id INTEGER NOT NULL,
  problem_id INTEGER NOT NULL,
  display_id TEXT NOT NULL,
  UNIQUE (contest_id, display_id)
);

-- 6. Articles
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type INTEGER DEFAULT 0,
  problem_id INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 7. Tags
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 8. Problem Tags
CREATE TABLE IF NOT EXISTS problem_tags (
  problem_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (problem_id, tag_id),
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 9. System Config
CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
