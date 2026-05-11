-- LLM config table for SQLite
CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Default LLM configuration
INSERT OR IGNORE INTO system_config (config_key, config_value) VALUES
  ('llm_provider', 'openai'),
  ('llm_api_key', ''),
  ('llm_base_url', 'https://api.openai.com/v1'),
  ('llm_model', 'gpt-4o-mini'),
  ('llm_feature_analyze_error', 'true'),
  ('llm_feature_generate_solution', 'true'),
  ('llm_feature_generate_problem', 'true'),
  ('llm_feature_contest_analysis', 'true'),
  ('llm_feature_explain_code', 'true'),
  ('llm_feature_recommend', 'true'),
  ('llm_feature_summarize_article', 'true');
