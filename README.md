# Hikari OJ v3

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![WebAssembly](https://img.shields.io/badge/WebAssembly-WASI-green)

Hikari OJ v3 是基于 Next.js App Router、TypeScript 与 SQLite 的在线评测系统。项目使用 WebAssembly（`llvm-wasm` 与 `@wasmer/wasi`）在浏览器中完成 C/C++ 编译、链接和逐测试点评测，并提供题库、记录、竞赛、讨论、AI 学习辅助和管理后台。

## ✨ 核心特性

- **浏览器边缘评测**：使用 clang、lld、WebAssembly 和 WASI 在客户端完成 C/C++ 编译与运行。
- **完整业务闭环**：包含账号、题库、提交记录、竞赛、实时排行榜、讨论与 Markdown 编辑。
- **管理后台**：提供数据仪表盘、题目与竞赛维护、AI 配置和 K-means 异常检测演示。
- **轻量持久化**：SQLite WAL 保存业务数据，测试样例以 `.in`/`.out` 文件管理。
- **流式 AI 辅助**：支持错误分析、题解生成和代码解释；AI 输出不参与最终判题。

> 浏览器评测适合教学、练习和低成本部署。客户端结果可能被篡改，正式高可信竞赛应增加服务端复判、签名测试点或可信执行环境。

---

## 🚀 快速上手

### 1. 安装依赖

请确保本机已安装 Node.js 20 或更高版本，然后执行：

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，设置 SQLite 路径和 JWT 密钥：

```bash
cp .env.example .env.local
```

```dotenv
DB_PATH=./data/ojv3.db
JWT_SECRET=replace-with-a-strong-random-secret
JWT_EXPIRE_HOURS=24
```

### 3. 初始化数据库与样例

初始化数据库、演示数据和 AI 配置：

```bash
npm run init-db
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

### 5. 一键脚本（Linux 部署 + macOS 打包）

项目已提供两个开箱即用的脚本：

```bash
# Linux 服务器上一键部署（安装依赖、可选初始化数据库、构建、后台启动）
bash scripts/deploy_linux.sh

# 如果数据库已初始化，可跳过 DB 步骤
bash scripts/deploy_linux.sh --skip-db

# macOS 上打包发布文件
bash scripts/package_macos.sh
```

如果你是手动在 Linux 上安装依赖（不是走脚本），请使用：

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
```

这可以避免服务器环境因 Puppeteer 下载 Chrome 失败而中断安装。

说明：
- Linux 部署日志默认输出到 `logs/ojv3.log`。
- Linux 部署会记录运行 PID 到 `.run/ojv3.pid`。
- macOS 打包产物默认位于 `release/` 目录。

---

## 📁 目录结构

- `src/app/`: Next.js 的前端页面视图和 App Router 核心路由。
  - `problem/[id]/submit`: 核心的前端纯沙盒 C/C++ 提交与运行逻辑。
- `src/app/api/v1/`: 后端接口 (Route Handlers)。
- `src/server/`: 鉴权、数据库、业务服务、AI 与 K-means 等服务端逻辑。
- `public/llvm-wasm/`: LLVM 到 Wasm 的本地运行时编译依赖环境 (`clang.js`, `clang.data`, `lld.data` 等)。
- `problem_data/`: 存放各题目的 `.in` 及 `.out` 样例文件，按照 `<problem_id>/<case_index>.in` 分类。
- `scripts/`: SQLite 初始化、迁移、部署和样例生成脚本。

## ✅ 项目检查

```bash
npm run lint
npm run build
```

`public/llvm-wasm` 中包含第三方生成文件；静态检查配置应避免把生成代码与业务代码混为一谈。

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
