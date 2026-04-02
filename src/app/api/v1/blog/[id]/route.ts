import { db } from "@/server/db";
import { fail, success } from "@/server/response";

interface BlogRow {
  id: number;
  user_id: number;
  title: string;
  content: string;
  views: number;
  created_at: string;
  updated_at: string;
  username: string;
  avatar: string;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const articleId = Number(id);
    if (!Number.isFinite(articleId) || articleId <= 0) {
      return fail("invalid blog id", 400);
    }

    await db.query("UPDATE articles SET views = views + 1 WHERE id = ? AND type = 0", [articleId]);

    const [rows] = await db.query(
      `
      SELECT
        a.id,
        a.user_id,
        a.title,
        a.content,
        a.views,
        a.created_at,
        a.updated_at,
        u.username,
        u.avatar
      FROM articles a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.id = ? AND a.type = 0
      LIMIT 1
      `,
      [articleId],
    );

    const blog = Array.isArray(rows) && rows.length > 0 ? (rows[0] as BlogRow) : null;
    if (!blog) {
      return fail("blog not found", 404);
    }

    return success(blog);
  } catch {
    return fail("failed to get blog detail", 500);
  }
}
