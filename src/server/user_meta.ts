import { db } from "@/server/db";

let ensured = false;
let ensuring: Promise<void> | null = null;

export async function ensureUserMetaColumns() {
  if (ensured) return;

  if (ensuring) {
    await ensuring;
    return;
  }

  ensuring = (async () => {
    const [rows] = await db.query("PRAGMA table_info(users)");
    const arr = rows as Array<{ name: string }>;
    const hasBadge = arr.some((col) => col.name === "badge");

    if (!hasBadge) {
      await db.query("ALTER TABLE users ADD COLUMN badge TEXT DEFAULT ''");
    }

    ensured = true;
  })();

  try {
    await ensuring;
  } finally {
    ensuring = null;
  }
}
