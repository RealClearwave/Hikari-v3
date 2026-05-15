import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { ensureUserMetaColumns } from "@/server/user_meta";

export async function GET(req: Request) {
  try {
    await ensureUserMetaColumns();

    const { searchParams } = new URL(req.url, "http://localhost");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const size = Math.min(100, Math.max(1, Number(searchParams.get("size") || 50)));

    const [countRows] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL",
      []
    );
    const total = Array.isArray(countRows) && countRows.length > 0
      ? Number((countRows[0] as { total: number }).total)
      : 0;

    const offset = (page - 1) * size;
    const [rows] = await db.query(
      `
      SELECT
        u.id AS user_id,
        u.username,
        u.avatar,
        u.role,
        u.badge,
        u.rating,
        COALESCE(COUNT(r.id), 0) AS submissions,
        COALESCE(SUM(CASE WHEN r.status = 2 THEN 1 ELSE 0 END), 0) AS accepted,
        ROUND(
          CASE WHEN COUNT(r.id) > 0
            THEN CAST(SUM(CASE WHEN r.status = 2 THEN 1 ELSE 0 END) AS REAL) * 100.0 / CAST(COUNT(r.id) AS REAL)
            ELSE 0
          END, 1
        ) AS accept_rate,
        MAX(r.created_at) AS last_active
      FROM users u
      LEFT JOIN records r ON r.user_id = u.id
      WHERE u.deleted_at IS NULL
      GROUP BY u.id
      ORDER BY accepted DESC, rating DESC, submissions ASC
      LIMIT ? OFFSET ?
      `,
      [size, offset]
    );

    return success({
      list: Array.isArray(rows) ? rows : [],
      total,
    });
  } catch {
    return fail("failed to get leaderboard", 500);
  }
}
