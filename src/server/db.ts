import Database from "better-sqlite3";
import { appConfig } from "@/server/config";
import { mkdirSync } from "fs";
import { dirname } from "path";

// Ensure data directory exists
mkdirSync(dirname(appConfig.dbPath), { recursive: true });

const sqlite = new Database(appConfig.dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

interface QueryResult {
  insertId?: number;
  affectedRows?: number;
}

// Async wrapper that preserves the mysql2-like interface
export const db = {
  async query(
    sql: string,
    params?: unknown[]
  ): Promise<[unknown[], QueryResult | undefined]> {
    // Determine statement type
    const trimmed = sql.trimStart();
    const isSelect = /^(SELECT|PRAGMA|WITH)\b/i.test(trimmed);
    const isInsert = /^INSERT\b/i.test(trimmed);
    const isCreate = /^(CREATE|ALTER)\b/i.test(trimmed);

    if (isSelect) {
      const stmt = sqlite.prepare(sql);
      const rows = params ? stmt.all(...params) : stmt.all();
      return [rows as unknown[], undefined];
    }

    if (isCreate) {
      sqlite.exec(sql);
      return [[], undefined];
    }

    const stmt = sqlite.prepare(sql);
    const result = params ? stmt.run(...params) : stmt.run();

    const info: QueryResult = {
      insertId: isInsert ? Number(result.lastInsertRowid) : undefined,
      affectedRows: Number(result.changes),
    };

    return [[], info];
  },

  // Direct access for sync operations if needed
  raw: sqlite,
};

export default db;
