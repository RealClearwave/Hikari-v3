import { db } from "@/server/db";

export const ARTICLE_TAG_SOLUTION = "题解";

let ensured = false;

export async function ensureArticleMetaColumns() {
  if (ensured) return;

  const [tagRows] = await db.query("SHOW COLUMNS FROM articles LIKE 'tags'");
  if (!Array.isArray(tagRows) || tagRows.length === 0) {
    await db.query("ALTER TABLE articles ADD COLUMN tags TEXT NULL");
  }

  ensured = true;
}

export function normalizeTags(input: unknown): string[] {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];

  const cleaned = raw
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0)
    .slice(0, 10);

  return Array.from(new Set(cleaned));
}

export function parseTagsField(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return normalizeTags(tags);
  }

  const text = String(tags || "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    return normalizeTags(parsed);
  } catch {
    return normalizeTags(text.split(","));
  }
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags);
}

export function computeArticleKind(tags: string[], linkedProblemId: number) {
  const hasSolutionTag = tags.includes(ARTICLE_TAG_SOLUTION);
  const type = hasSolutionTag ? 1 : 0;
  const problemId = hasSolutionTag && linkedProblemId > 0 ? linkedProblemId : 0;
  return { type, problemId };
}
