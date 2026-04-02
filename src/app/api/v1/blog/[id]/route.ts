import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";
import { computeArticleKind, ensureArticleMetaColumns, normalizeTags, parseTagsField, stringifyTags } from "@/server/article";
import { ensureUserMetaColumns } from "@/server/user_meta";

interface BlogRow {
  id: number;
  user_id: number;
  title: string;
  content: string;
  views: number;
  type: number;
  problem_id: number;
  tags: unknown;
  created_at: string;
  updated_at: string;
  username: string;
  avatar: string;
  role: number;
  badge: string;
  accepted_count: number;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureArticleMetaColumns();
    await ensureUserMetaColumns();

    const { id } = await context.params;
    const articleId = Number(id);
    if (!Number.isFinite(articleId) || articleId <= 0) {
      return fail("invalid blog id", 400);
    }

    await db.query("UPDATE articles SET views = views + 1 WHERE id = ? AND type IN (0, 1)", [articleId]);

    const [rows] = await db.query(
      `
      SELECT
        a.id,
        a.user_id,
        a.title,
        a.content,
        a.views,
        a.type,
        a.problem_id,
        a.tags,
        a.created_at,
        a.updated_at,
        u.username,
        u.avatar,
        COALESCE(u.role, 0) AS role,
        COALESCE(u.badge, '') AS badge,
        COALESCE(us.accepted_count, 0) AS accepted_count
      FROM articles a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN (
        SELECT user_id, SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS accepted_count
        FROM records
        GROUP BY user_id
      ) us ON us.user_id = a.user_id
      WHERE a.id = ? AND a.type IN (0, 1)
      LIMIT 1
      `,
      [articleId],
    );

    const blog = Array.isArray(rows) && rows.length > 0 ? (rows[0] as BlogRow) : null;
    if (!blog) {
      return fail("blog not found", 404);
    }

    blog.tags = parseTagsField(blog.tags);

    return success(blog);
  } catch {
    return fail("failed to get blog detail", 500);
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureArticleMetaColumns();

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

    const [rows] = await db.query(
      "SELECT id, user_id FROM articles WHERE id = ? AND type IN (0, 1) LIMIT 1",
      [articleId],
    );
    const article = Array.isArray(rows) && rows.length > 0
      ? (rows[0] as { id: number; user_id: number })
      : null;
    if (!article) {
      return fail("blog not found", 404);
    }

    const canEdit = claims.role === 1 || claims.user_id === article.user_id;
    if (!canEdit) {
      return fail("forbidden", 403);
    }

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const content = String(body?.content || "").trim();
    const tags = normalizeTags(body?.tags);
    const linkedProblemId = Number(body?.problem_id || 0);
    const { type, problemId } = computeArticleKind(tags, linkedProblemId);

    if (!title || !content) {
      return fail("title and content are required", 400);
    }

    await db.query(
      "UPDATE articles SET title = ?, content = ?, type = ?, problem_id = ?, tags = ?, updated_at = NOW() WHERE id = ?",
      [title, content, type, problemId, stringifyTags(tags), articleId],
    );

    return success({ ok: true });
  } catch {
    return fail("failed to update blog", 500);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
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

    const [rows] = await db.query(
      "SELECT id, user_id FROM articles WHERE id = ? AND type IN (0, 1) LIMIT 1",
      [articleId],
    );
    const article = Array.isArray(rows) && rows.length > 0
      ? (rows[0] as { id: number; user_id: number })
      : null;
    if (!article) {
      return fail("blog not found", 404);
    }

    const canDelete = claims.role === 1 || claims.user_id === article.user_id;
    if (!canDelete) {
      return fail("forbidden", 403);
    }

    await db.query("DELETE FROM articles WHERE id = ?", [articleId]);
    await db.query("DELETE FROM article_replies WHERE article_id = ?", [articleId]);

    return success({ ok: true });
  } catch {
    return fail("failed to delete blog", 500);
  }
}
