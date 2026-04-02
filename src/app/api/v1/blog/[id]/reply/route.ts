import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";

async function ensureReplyTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS article_replies (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      article_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_article_id (article_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureReplyTable();

    const { id } = await context.params;
    const articleId = Number(id);
    if (!Number.isFinite(articleId) || articleId <= 0) {
      return fail("invalid blog id", 400);
    }

    const [rows] = await db.query(
      `
      SELECT
        r.id,
        r.article_id,
        r.user_id,
        r.content,
        r.created_at,
        r.updated_at,
        COALESCE(u.username, '') AS username,
        COALESCE(u.avatar, '') AS avatar
      FROM article_replies r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.article_id = ? AND r.deleted_at IS NULL
      ORDER BY r.id ASC
      `,
      [articleId],
    );

    return success({ list: Array.isArray(rows) ? rows : [] });
  } catch {
    return fail("failed to get reply list", 500);
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureReplyTable();

    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims?.user_id) {
      return fail("unauthorized", 401);
    }

    const { id } = await context.params;
    const articleId = Number(id);
    if (!Number.isFinite(articleId) || articleId <= 0) {
      return fail("invalid blog id", 400);
    }

    const body = await req.json();
    const content = String(body?.content || "").trim();
    if (!content) {
      return fail("content is required", 400);
    }
    if (content.length > 2000) {
      return fail("content is too long", 400);
    }

    const [articleRows] = await db.query(
      "SELECT id FROM articles WHERE id = ? AND type IN (0, 1) LIMIT 1",
      [articleId],
    );
    if (!Array.isArray(articleRows) || articleRows.length === 0) {
      return fail("blog not found", 404);
    }

    const [result] = await db.query(
      "INSERT INTO article_replies (article_id, user_id, content) VALUES (?, ?, ?)",
      [articleId, claims.user_id, content],
    );

    const insertId = Number((result as { insertId?: number }).insertId || 0);
    return success({ id: insertId });
  } catch {
    return fail("failed to create reply", 500);
  }
}
