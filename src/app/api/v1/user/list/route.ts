import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { ensureUserMetaColumns } from "@/server/user_meta";

export async function GET(req: Request) {
  try {
    await ensureUserMetaColumns();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const size = Math.min(100, Math.max(1, Number(searchParams.get("size") || 20)));
    const offset = (page - 1) * size;

    const [countRows] = await db.query("SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL");
    const total =
      Array.isArray(countRows) && countRows.length > 0
        ? Number((countRows[0] as { total: number }).total)
        : 0;

    const [rows] = await db.query(
      `
      SELECT
        u.id AS userId,
        u.username,
        u.avatar,
        u.role,
        u.badge,
        u.rating,
        COALESCE(SUM(CASE WHEN r.status = 2 THEN 1 ELSE 0 END), 0) AS accepted,
        COALESCE(COUNT(r.id), 0) AS submissions
      FROM users u
      LEFT JOIN records r ON r.user_id = u.id
      WHERE u.deleted_at IS NULL
      GROUP BY u.id, u.username, u.avatar, u.role, u.badge, u.rating
      ORDER BY u.rating DESC, accepted DESC, submissions DESC, u.id ASC
      LIMIT ? OFFSET ?
      `,
      [size, offset],
    );

    return success({ list: Array.isArray(rows) ? rows : [], total });
  } catch {
    return fail("failed to get user list", 500);
  }
}
