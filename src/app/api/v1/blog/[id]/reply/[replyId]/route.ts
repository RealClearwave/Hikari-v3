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

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; replyId: string }> },
) {
  try {
    await ensureReplyTable();

    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims?.user_id) {
      return fail("unauthorized", 401);
    }

    const { id, replyId } = await context.params;
    const articleId = Number(id);
    const rid = Number(replyId);
    if (!Number.isFinite(articleId) || articleId <= 0 || !Number.isFinite(rid) || rid <= 0) {
      return fail("invalid id", 400);
    }

    const [rows] = await db.query(
      "SELECT id, user_id FROM article_replies WHERE id = ? AND article_id = ? AND deleted_at IS NULL LIMIT 1",
      [rid, articleId],
    );
    const reply = Array.isArray(rows) && rows.length > 0
      ? (rows[0] as { id: number; user_id: number })
      : null;
    if (!reply) {
      return fail("reply not found", 404);
    }

    const canDelete = claims.role === 1 || claims.user_id === reply.user_id;
    if (!canDelete) {
      return fail("forbidden", 403);
    }

    await db.query("UPDATE article_replies SET deleted_at = NOW() WHERE id = ?", [rid]);
    return success({ ok: true });
  } catch {
    return fail("failed to delete reply", 500);
  }
}
