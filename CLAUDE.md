# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start dev server on 0.0.0.0:3000 (all interfaces)
npm run build            # Production build (Turbopack + TypeScript)
npm start                # Start production server
npm run lint             # ESLint
npm run init-db          # Initialize/reset SQLite database with seed data
node scripts/init-db.js  # Same as above
```

**Database migrations**: Apply `.sql` files to `data/ojv3.db`:
```bash
cat scripts/migrate_xxx.sql | sqlite3 data/ojv3.db
```

## Architecture

### Stack
- **Next.js 16** App Router with Turbopack (read `node_modules/next/dist/docs/` for breaking changes)
- **SQLite** via `better-sqlite3` (single file `data/ojv3.db`, WAL mode)
- **Chakra UI v2** with dark mode support (`useSystemColorMode: true`)
- **TypeScript** strict mode, path alias `@/` → `src/`

### Database wrapper (`src/server/db.ts`)
`better-sqlite3` is synchronous; the project wraps it in an async `db.query()` for backward compatibility with the original mysql2 API:
```ts
const [rows] = await db.query("SELECT ...", [params]);
// → returns [unknown[], QueryResult?]
// For INSERT/UPDATE/DELETE: const [, info] = await db.query(...)
// info.insertId / info.affectedRows
```
**Critical**: `better-sqlite3` only accepts numbers, strings, bigints, buffers, null. Never pass booleans — use `1`/`0`. Parameters are spread as variadic args to `stmt.all()` / `stmt.run()`.

### Auth (`src/server/auth.ts`)
JWT Bearer token pattern. `signToken()`, `verifyToken()`, `parseAuthorizationHeader()`. Claims: `{ user_id, username, role }`. Role `1` = admin.

### API Response (`src/server/response.ts`)
```ts
success(data, status?)  // → { code: 0, msg: "success", data }
fail(msg, status?, code?) // → { code, msg, data: null }
```
Second param to `success()` is HTTP status code (number), not a message string.

### Frontend patterns
- **API client** (`src/api/*.ts`): Wraps `src/utils/request.ts` (Axios instance, base `/api/v1`, auto-attaches Bearer token)
- **Auth store** (`src/store/auth.ts`): Zustand, persists to localStorage
- **Chakra UI**: `Card`, `Container maxW="1200px"`, `useToast`. Use semantic tokens (`gray.50`, `blackAlpha.100`) not hardcoded hex — they adapt to dark mode. Use `bg={{ base: "white", _dark: "gray.800" }}` for explicit light/dark overrides.

### Directory layout
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/v1/             # Route handlers (each folder = one route)
│   │   └── admin/          # Admin-only APIs (check claims.role === 1)
│   ├── admin/              # Admin pages (protected client-side)
│   ├── problem/[id]/       # Problem detail + submit (WASM judge)
│   └── navbar.tsx          # Global navbar with auth + admin menu
├── api/                    # Frontend API client modules
├── server/                 # Server-side logic (db, auth, prompts)
├── store/                  # Zustand stores
├── components/             # Shared UI components
├── theme/                  # Chakra UI theme
└── utils/                  # Axios wrapper
public/llvm-wasm/           # LLVM → Wasm compiler runtime
scripts/                    # init-db, SQL migrations, seed data
```

### WASM Judge (`public/llvm-wasm/index.js`)
Client-side C/C++ compilation via `compileAndRun(code, input, language)`. Used in `src/app/problem/[id]/submit/page.tsx`. Compiles with clang WASM, links with lld WASM, executes with `@wasmer/wasi`. Status mapping: 0=Pending, 1=Judging, 2=AC, 3=WA, 4=TLE, 5=MLE, 6=RE, 7=CE.

### AI Features (SSE Streaming)
7 AI endpoints under `/api/v1/ai/` — all use SSE streaming via `ReadableStream` + `TextDecoder({stream: true})`.
- Prompt templates in `src/server/ai/prompts.ts`
- Config (provider/apiKey/model/feature toggles) in `system_config` table, managed via `/admin/ai-config`
- `streamAiResponse(path, body, onToken)` frontend helper in `src/api/ai-stream.ts`

### LLVM Config (`src/server/ai/config.ts`)
`getLlmConfig()` reads from `system_config` table (key-value pairs). Admin-configurable provider, API key, base URL, model, and per-feature toggles. `updateLlmConfig()` for partial updates.

## Common Pitfalls

1. **`new URL(req.url)` throws `Invalid URL`** — Next.js App Router provides relative URLs. Always use `new URL(req.url, "http://localhost")` in route handlers.

2. **`db.query()` destructuring for INSERT** — The result is `[rows[], info]`. Must use `const [, info] = await db.query(...)` for INSERT, NOT `const [result]` (that gets the empty rows array, `insertId` will be 0).

3. **Boolean params to better-sqlite3** — Causes `SqliteError: SQLite3 can only bind numbers, strings, bigints, buffers, and null`. Use `1`/`0` instead of `true`/`false`.

4. **Chakra UI `extendTheme` is client-only** — Cannot be imported in server components. `ColorModeScript` must live in a `"use client"` component (see `src/app/providers.tsx`).

5. **NEVER reuse option objects across PptxGenJS calls** — it mutates objects in-place (converting values to EMU). Use factory functions to create fresh objects each time.

6. **`success()` second param is HTTP status, not message** — `success(data, 201)` not `success(data, "created")`.

7. **Chakra components naming** — `isLoading` not `loading` (Button), `isChecked` not `checked` (Switch), `isDisabled` not `disabled`.
