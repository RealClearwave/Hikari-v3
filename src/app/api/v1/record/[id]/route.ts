import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { ensureUserMetaColumns } from "@/server/user_meta";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await ensureUserMetaColumns();

    const { id } = await ctx.params;
    const recordId = Number(id);
    if (!Number.isFinite(recordId) || recordId <= 0) {
      return fail("invalid record id", 400);
    }

    const [rows] = await db.query(
      `
      SELECT
        r.id,
        r.user_id,
        r.problem_id,
        r.contest_id,
        r.language,
        r.code,
        r.status,
        r.time_used,
        r.memory_used,
        r.error_info,
        r.created_at,
        u.username,
        u.avatar,
        COALESCE(u.role, 0) AS role,
        COALESCE(u.badge, '') AS badge,
        COALESCE(us.accepted_count, 0) AS accepted_count,
        p.title AS problem_title
      FROM records r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN problems p ON p.id = r.problem_id
      LEFT JOIN (
        SELECT user_id, SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS accepted_count
        FROM records
        GROUP BY user_id
      ) us ON us.user_id = r.user_id
      WHERE r.id = ?
      LIMIT 1
      `,
      [recordId],
    );

    const record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!record) {
      return fail("record not found", 404);
    }

    return success({ record });
  } catch {
    return fail("failed to get record detail", 500);
  }
}
