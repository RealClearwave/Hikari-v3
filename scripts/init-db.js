#!/usr/bin/env node
// Initialize SQLite database with schema, seed data, and AI config
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "ojv3.db");
const dbDir = path.dirname(DB_PATH);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const sqlFiles = ["init.sql", "seed.sql", "migrate_ai.sql"];

for (const file of sqlFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const sql = fs.readFileSync(filePath, "utf8");
    db.exec(sql);
    console.log(`[OK] Executed ${file}`);
  } else {
    console.log(`[SKIP] ${file} not found`);
  }
}

db.close();
console.log(`[DONE] Database initialized at ${DB_PATH}`);
