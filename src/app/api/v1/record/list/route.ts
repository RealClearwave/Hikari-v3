import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { ensureUserMetaColumns } from "@/server/user_meta";

export async function GET(req: Request) {
  try {
    await ensureUserMetaColumns();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const size = Math.min(100, Math.max(1, Number(searchParams.get("size") || 20)));
    const problemId = Number(searchParams.get("problem_id") || 0);
    const userId = Number(searchParams.get("user_id") || 0);

    const wherePartsBase: string[] = [];
    const wherePartsJoin: string[] = [];
    const params: Array<number> = [];
    if (problemId > 0) {
      wherePartsBase.push("problem_id = ?");
      wherePartsJoin.push("r.problem_id = ?");
      params.push(problemId);
    }
    if (userId > 0) {
      wherePartsBase.push("user_id = ?");
      wherePartsJoin.push("r.user_id = ?");
      params.push(userId);
    }
    const whereSQLBase = wherePartsBase.length > 0 ? `WHERE ${wherePartsBase.join(" AND ")}` : "";
    const whereSQLJoin = wherePartsJoin.length > 0 ? `WHERE ${wherePartsJoin.join(" AND ")}` : "";

    const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM records ${whereSQLBase}`, params);
    const total = Array.isArray(countRows) && countRows.length > 0 ? Number((countRows[0] as { total: number }).total) : 0;

    const [statusRows] = await db.query(
      `
      SELECT status, COUNT(*) AS count
      FROM records
      ${whereSQLBase}
      GROUP BY status
      `,
      params,
    );
    const statusCounts: Record<string, number> = {};
    if (Array.isArray(statusRows)) {
      for (const row of statusRows as Array<{ status: number; count: number }>) {
        statusCounts[String(row.status)] = Number(row.count || 0);
      }
    }

    const offset = (page - 1) * size;
    const [rows] = await db.query(
      `
      SELECT
        r.id,
        r.user_id,
        r.problem_id,
        r.contest_id,
        r.language,
        r.status,
        r.time_used,
        r.memory_used,
        r.error_info,
        r.created_at,
        COALESCE(u.username, '') AS username,
        COALESCE(u.avatar, '') AS avatar,
        COALESCE(u.role, 0) AS role,
        COALESCE(u.badge, '') AS badge,
        COALESCE(us.accepted_count, 0) AS accepted_count
      FROM records r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN (
        SELECT user_id, SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS accepted_count
        FROM records
        GROUP BY user_id
      ) us ON us.user_id = r.user_id
      ${whereSQLJoin}
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, size, offset],
    );

    return success({
      list: Array.isArray(rows) ? rows : [],
      total,
      stats: {
        status_counts: statusCounts,
      },
    });
  } catch {
    return fail("failed to get record list", 500);
  }
}
