CREATE DATABASE IF NOT EXISTS `ojv3` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `ojv3`;

-- 1. 用户表 (Users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(64) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `email` VARCHAR(128) NOT NULL UNIQUE,
  `avatar` VARCHAR(255) DEFAULT '',
  `role` TINYINT DEFAULT 0 COMMENT '0: 普通用户, 1: 管理员',
  `rating` INT DEFAULT 1500 COMMENT '用户积分/排名依据',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 题目表 (Problems)
CREATE TABLE IF NOT EXISTS `problems` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `input_format` TEXT,
  `output_format` TEXT,
  `sample_cases` JSON COMMENT '样例输入输出 [{"input": "...", "output": "..."}]',
  `time_limit` INT NOT NULL COMMENT '时间限制 (ms)',
  `memory_limit` INT NOT NULL COMMENT '内存限制 (KB)',
  `difficulty` TINYINT DEFAULT 1 COMMENT '1: 简单, 2: 中等, 3: 困难',
  `is_public` BOOLEAN DEFAULT TRUE COMMENT '是否对普通用户可见',
  `created_by` BIGINT NOT NULL COMMENT '创建者 ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 评测记录表 (Records)
CREATE TABLE IF NOT EXISTS `records` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `problem_id` BIGINT NOT NULL,
  `contest_id` BIGINT DEFAULT 0 COMMENT '非0表示在竞赛中提交',
  `language` VARCHAR(32) NOT NULL COMMENT 'c, cpp, java, go, python 等',
  `code` TEXT NOT NULL,
  `status` TINYINT DEFAULT 0 COMMENT '0: Pending, 1: Judging, 2: AC, 3: WA, 4: TLE, 5: MLE, 6: RE, 7: CE',
  `time_used` INT DEFAULT 0 COMMENT '执行耗时 (ms)',
  `memory_used` INT DEFAULT 0 COMMENT '内存消耗 (KB)',
  `error_info` TEXT COMMENT '编译错误或运行异常信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_problem_id` (`problem_id`),
  INDEX `idx_contest_id` (`contest_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 竞赛表 (Contests)
CREATE TABLE IF NOT EXISTS `contests` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `start_time` TIMESTAMP NOT NULL,
  `end_time` TIMESTAMP NOT NULL,
  `type` TINYINT DEFAULT 0 COMMENT '0: ACM, 1: OI',
  `password` VARCHAR(128) DEFAULT '' COMMENT '留空则为公开赛',
  `created_by` BIGINT NOT NULL COMMENT '创建人',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 竞赛_题目 关联表 (Contest_Problems)
CREATE TABLE IF NOT EXISTS `contest_problems` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `contest_id` BIGINT NOT NULL,
  `problem_id` BIGINT NOT NULL,
  `display_id` VARCHAR(16) NOT NULL COMMENT '例如 A, B, C',
  UNIQUE KEY `uk_contest_display` (`contest_id`, `display_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. 博客/讨论表 (Articles)
CREATE TABLE IF NOT EXISTS `articles` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `type` TINYINT DEFAULT 0 COMMENT '0: 博客, 1: 题解, 2: 讨论',
  `problem_id` BIGINT DEFAULT 0 COMMENT '如果为题解/题目讨论，关联题目ID',
  `views` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;