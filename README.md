# OJv3 Next.js

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![WebAssembly](https://img.shields.io/badge/WebAssembly-WASI-green)

OJv3 Next.js 是在线评测系统 (Online Judge) OJv3 的现代化重构版本。本项目采用 **Next.js (App Router)** 进行全栈开发，彻底打通了前后端的交互体验，并引入了基于 WebAssembly (`llvm-wasm` & `@wasmer/wasi`) 的纯前端/浏览器端 C/C++ 评测能力。

## ✨ 核心特性

- **Next.js App Router**: 极致体验的服务端渲染 (SSR) 和服务端组件 (RSC)，以及极速的 API 路由。
- **纯前端安全沙箱评测**: 放弃传统的后端重型沙盒，利用 WebAssembly (`@wasmer/wasi`) 在浏览器本地安全、高效地编译 (`clang`) 和链接 (`lld`) C/C++ 代码，并完成判题。
- **文件化测试样例管理**: 采用 `.in` 和 `.out` 的形式替代原有的数据库 JSON 存储结构，大大减少了数据库带宽占用和负载，提高大体积数据读取性能。
- **Chakra UI 界面**: 提供优雅、现代的评测页面排版，并且包含详尽直观的“编译中 / 评测中 / AC / WA”实时动效反馈。
- **MySQL 关系型数据库**: 提供稳健的用户、题目、提交记录元数据与关联管理。

---

## 🚀 快速上手

### 1. 安装依赖

请确保本机环境安装了 Node.js (推荐 Node 20+) 和 MySQL。然后执行：

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并配置你本地的 MySQL 数据库信息和 JWT 密钥：

```bash
cp .env.example .env.local
```

必须配置的关键环境变量：
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRE_HOURS`

### 3. 初始化数据库与样例

你可以使用根目录 `scripts` 下的脚本快速构建并填充测试数据：

```bash
# 导入数据表结构
mysql -u root -p < scripts/init.sql

# 导入样例用户、初始题目和 Contest 等测试信息
mysql -u root -p < scripts/seed.sql

# 生成/同步对应题目的样例依赖文件 (.in & .out)
bash scripts/seed_sample_files.sh
```

*默认的示例测试账号：*
- **管理员**: `admin` / `admin123`
- **普通用户**: `alice` / `user123`

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可看到页面。

对于生产环境部署，使用：
```bash
npm run build
npm start
```

---

## 📁 目录结构与架构设定

- `src/app/`: Next.js 的前端页面视图和 App Router 核心路由。
  - `problem/[id]/submit`: 核心的前端纯沙盒 C/C++ 提交与运行逻辑。
- `src/app/api/v1/`: 后端接口 (Route Handlers)。
- `src/server/`: 服务端逻辑层，比如 `problem_samples.ts` 用于存取文件格式 `.in`, `.out` 样例。
- `public/llvm-wasm/`: LLVM 到 Wasm 的本地运行时编译依赖环境 (`clang.js`, `clang.data`, `lld.data` 等)。
- `problem_data/`: 存放各题目的 `.in` 及 `.out` 样例文件，按照 `<problem_id>/<case_index>.in` 分类。

## 🌐 API 接口规范

所有的 API 请求都应发起至 `/api/v1/*`。返回的 JSON 数据格式已统一规范为：

```json
{
  "code": 0,         // 业务状态码 (0 表示成功)
  "msg": "success",  // 文字说明
  "data": {}         // 请求成功时的数据载荷
}
```

## 📄 License (许可证)

本项目采用 [MIT License](./LICENSE) 授权协议开源。
