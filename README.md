# OJv3 Next.js

该目录是 OJv3 的 Next.js 重构版本，包含：

- 前端页面迁移到 App Router
- 后端 API 迁移到 Next.js Route Handlers（`/api/v1/**`）

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并按你的本地环境修改：

```bash
cp .env.example .env.local
```

关键变量：

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRE_HOURS`

## 3. 初始化数据库

使用 SQL 脚本：

- `scripts/init.sql`
- `scripts/seed.sql`（插入示例数据，便于功能测试）
- `scripts/seed_sample_files.sh`（创建题目样例 `.in/.out` 文件）

示例：

```bash
mysql -u root -p < scripts/init.sql
mysql -u root -p < scripts/seed.sql
bash scripts/seed_sample_files.sh
```

题目样例不再存储在数据库 `sample_cases` 字段中，改为文件形式：

- `problem_data/<problem_id>/<case_index>.in`
- `problem_data/<problem_id>/<case_index>.out`

示例测试账号：

- 管理员：`admin` / `admin123`
- 普通用户：`alice` / `user123`

## 4. 启动开发环境

```bash
npm run dev
```

默认地址：`http://localhost:3000`

## 5. 已迁移 API

基础：

- `GET /api/v1/ping`

用户：

- `POST /api/v1/user/register`
- `POST /api/v1/user/login`

题目：

- `GET /api/v1/problem/list`
- `GET /api/v1/problem/:id`
- `POST /api/v1/problem`（需要管理员 JWT）

记录：

- `GET /api/v1/record/list`
- `POST /api/v1/record/submit`（需要登录 JWT）

竞赛/博客：

- `GET /api/v1/contest/list`
- `GET /api/v1/blog/list`

## 6. 响应格式

统一响应结构：

```json
{
	"code": 0,
	"msg": "success",
	"data": {}
}
```

前端请求默认基址：`/api/v1`。
