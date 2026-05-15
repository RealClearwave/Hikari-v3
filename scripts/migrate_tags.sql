-- Tag system for problems
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS problem_tags (
  problem_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (problem_id, tag_id),
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Default tags
INSERT OR IGNORE INTO tags (id, name, color) VALUES
  (1, '基础', 'blue'),
  (2, '数组', 'green'),
  (3, '字符串', 'teal'),
  (4, '排序', 'orange'),
  (5, '搜索', 'purple'),
  (6, '动态规划', 'red'),
  (7, '贪心', 'yellow'),
  (8, '图论', 'pink'),
  (9, '数学', 'cyan'),
  (10, '数据结构', 'blue'),
  (11, '栈/队列', 'green'),
  (12, '树', 'orange'),
  (13, '并查集', 'purple'),
  (14, '前缀和', 'teal'),
  (15, '二分', 'red'),
  (16, '位运算', 'yellow'),
  (17, '递归', 'pink'),
  (18, '分治', 'cyan'),
  (19, '模拟', 'blue'),
  (20, '几何', 'green');

-- Sample problem-tag mappings (A+B = 基础/数学, Max Subarray = DP, Shortest Path = 图论)
INSERT OR IGNORE INTO problem_tags (problem_id, tag_id) VALUES
  (1000, 1), (1000, 9),
  (1001, 6),
  (1002, 8);
