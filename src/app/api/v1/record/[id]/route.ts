import { db } from "@/server/db";
import { fail, success } from "@/server/response";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
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
        p.title AS problem_title
      FROM records r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN problems p ON p.id = r.problem_id
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
