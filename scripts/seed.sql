USE `ojv3`;

START TRANSACTION;

-- Users (passwords: admin123 / user123)
INSERT INTO `users` (`id`, `username`, `password_hash`, `email`, `avatar`, `role`, `rating`)
VALUES
  (1, 'admin', '$2b$10$j4oGGcgx9zop4NwrlYOR3OqTwHXrzMLutmT20bayn.a6/.g711GK2', 'admin@example.com', '', 1, 2100),
  (2, 'alice', '$2b$10$RgJj21fC0Wd8tv6Z2ww7zeYbRIm1T9fKfS9bjIxvvNTn9RzN4p4.2', 'alice@example.com', '', 0, 1680),
  (3, 'bob', '$2b$10$RgJj21fC0Wd8tv6Z2ww7zeYbRIm1T9fKfS9bjIxvvNTn9RzN4p4.2', 'bob@example.com', '', 0, 1550)
ON DUPLICATE KEY UPDATE
  `username` = VALUES(`username`),
  `password_hash` = VALUES(`password_hash`),
  `email` = VALUES(`email`),
  `avatar` = VALUES(`avatar`),
  `role` = VALUES(`role`),
  `rating` = VALUES(`rating`);

-- Problems
INSERT INTO `problems`
  (`id`, `title`, `description`, `input_format`, `output_format`, `sample_cases`, `time_limit`, `memory_limit`, `difficulty`, `is_public`, `created_by`)
VALUES
  (1000, 'A + B Problem', 'Given two integers A and B, output A + B.',
   'Two integers A and B.', 'One integer, the sum of A and B.',
   JSON_ARRAY(),
   1000, 262144, 1, TRUE, 1),
  (1001, 'Maximum Subarray', 'Find the maximum subarray sum for a given integer sequence.',
   'First line N, second line N integers.', 'One integer, the maximum subarray sum.',
   JSON_ARRAY(),
   2000, 262144, 2, TRUE, 1),
  (1002, 'Shortest Path (Template)', 'Given a weighted graph and source node, find shortest path.',
   'N M S, followed by M edges u v w.', 'Distance array from source S.',
   JSON_ARRAY(),
   3000, 524288, 3, TRUE, 1)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `description` = VALUES(`description`),
  `input_format` = VALUES(`input_format`),
  `output_format` = VALUES(`output_format`),
  `sample_cases` = VALUES(`sample_cases`),
  `time_limit` = VALUES(`time_limit`),
  `memory_limit` = VALUES(`memory_limit`),
  `difficulty` = VALUES(`difficulty`),
  `is_public` = VALUES(`is_public`),
  `created_by` = VALUES(`created_by`),
  `deleted_at` = NULL;

-- Contests
INSERT INTO `contests` (`id`, `title`, `description`, `start_time`, `end_time`, `type`, `password`, `created_by`)
VALUES
  (1, 'Spring Beginner Contest', 'Beginner friendly contest with 3 problems.',
   '2026-03-28 10:00:00', '2026-03-28 12:00:00', 0, '', 1),
  (2, 'Weekly Practice #1', 'Open practice contest for new users.',
   '2026-04-01 19:00:00', '2026-04-01 21:00:00', 0, '', 1)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `description` = VALUES(`description`),
  `start_time` = VALUES(`start_time`),
  `end_time` = VALUES(`end_time`),
  `type` = VALUES(`type`),
  `password` = VALUES(`password`),
  `created_by` = VALUES(`created_by`);

-- Contest-Problem mapping
INSERT INTO `contest_problems` (`id`, `contest_id`, `problem_id`, `display_id`)
VALUES
  (1, 1, 1000, 'A'),
  (2, 1, 1001, 'B'),
  (3, 1, 1002, 'C'),
  (4, 2, 1000, 'A'),
  (5, 2, 1001, 'B')
ON DUPLICATE KEY UPDATE
  `contest_id` = VALUES(`contest_id`),
  `problem_id` = VALUES(`problem_id`),
  `display_id` = VALUES(`display_id`);

-- Records (status: 2=AC, 3=WA, 4=TLE)
INSERT INTO `records`
  (`id`, `user_id`, `problem_id`, `contest_id`, `language`, `code`, `status`, `time_used`, `memory_used`, `error_info`, `created_at`)
VALUES
  (1, 2, 1000, 0, 'cpp', '#include <bits/stdc++.h>\nusing namespace std;\nint main(){long long a,b;cin>>a>>b;cout<<a+b;}', 2, 12, 1024, '', '2026-03-30 10:00:00'),
  (2, 2, 1001, 0, 'python', 'n=int(input())\na=list(map(int,input().split()))\nprint(max(a))', 3, 8, 2048, 'wrong answer on hidden case', '2026-03-30 10:05:00'),
  (3, 3, 1000, 1, 'java', 'public class Main { public static void main(String[] args){} }', 2, 25, 8192, '', '2026-03-30 11:00:00'),
  (4, 3, 1002, 1, 'go', 'package main\nfunc main(){}', 4, 3001, 65536, 'time limit exceeded', '2026-03-30 11:20:00'),
  (5, 2, 1002, 0, 'cpp', 'int main(){return 0;}', 2, 188, 12288, '', '2026-03-31 09:15:00'),
  (6, 1, 1001, 0, 'cpp', 'int main(){return 0;}', 2, 33, 4096, '', '2026-03-31 12:00:00')
ON DUPLICATE KEY UPDATE
  `user_id` = VALUES(`user_id`),
  `problem_id` = VALUES(`problem_id`),
  `contest_id` = VALUES(`contest_id`),
  `language` = VALUES(`language`),
  `code` = VALUES(`code`),
  `status` = VALUES(`status`),
  `time_used` = VALUES(`time_used`),
  `memory_used` = VALUES(`memory_used`),
  `error_info` = VALUES(`error_info`),
  `created_at` = VALUES(`created_at`);

-- Articles (type: 0=blog, 1=solution, 2=discussion)
INSERT INTO `articles`
  (`id`, `user_id`, `title`, `content`, `type`, `problem_id`, `views`, `created_at`)
VALUES
  (1, 1, 'Welcome to OJv3', 'This is a sample announcement post for test environment.', 0, 0, 128, '2026-03-29 09:00:00'),
  (2, 2, 'A+B Problem Solution', 'Use direct integer addition with fast I/O.', 1, 1000, 66, '2026-03-29 13:30:00'),
  (3, 3, 'How to prepare for weekly contests', 'Discuss your training strategy and tag difficult problems.', 2, 0, 52, '2026-03-30 14:20:00')
ON DUPLICATE KEY UPDATE
  `user_id` = VALUES(`user_id`),
  `title` = VALUES(`title`),
  `content` = VALUES(`content`),
  `type` = VALUES(`type`),
  `problem_id` = VALUES(`problem_id`),
  `views` = VALUES(`views`),
  `created_at` = VALUES(`created_at`);

COMMIT;
