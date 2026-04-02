import { db } from "@/server/db";

let ensured = false;
let ensuring: Promise<void> | null = null;

export async function ensureUserMetaColumns() {
  if (ensured) return;

  // Avoid concurrent ALTER calls under high request concurrency.
  if (ensuring) {
    await ensuring;
    return;
  }

  ensuring = (async () => {
    const [rows] = await db.query("SHOW COLUMNS FROM users LIKE 'badge'");
    const exists = Array.isArray(rows) && rows.length > 0;

    if (!exists) {
      await db.query("ALTER TABLE users ADD COLUMN badge VARCHAR(64) DEFAULT ''");
    }

    ensured = true;
  })();

  try {
    await ensuring;
  } finally {
    ensuring = null;
  }
}
