import { db } from "@/server/db";
import { fail, success } from "@/server/response";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const size = Math.min(100, Math.max(1, Number(searchParams.get("size") || 20)));
    const problemId = Number(searchParams.get("problem_id") || 0);
    const userId = Number(searchParams.get("user_id") || 0);

    const whereParts: string[] = [];
    const params: Array<number> = [];
    if (problemId > 0) {
      whereParts.push("problem_id = ?");
      params.push(problemId);
    }
    if (userId > 0) {
      whereParts.push("user_id = ?");
      params.push(userId);
    }
    const whereSQL = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM records ${whereSQL}`, params);
    const total = Array.isArray(countRows) && countRows.length > 0 ? Number((countRows[0] as { total: number }).total) : 0;

    const [statusRows] = await db.query(
      `
      SELECT status, COUNT(*) AS count
      FROM records
      ${whereSQL}
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
        COALESCE(u.avatar, '') AS avatar
      FROM records r
      LEFT JOIN users u ON u.id = r.user_id
      ${whereSQL}
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
