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

    const offset = (page - 1) * size;
    const [rows] = await db.query(
      `
      SELECT id, user_id, problem_id, contest_id, language, status, time_used, memory_used, error_info, created_at
      FROM records
      ${whereSQL}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, size, offset],
    );

    return success({ list: Array.isArray(rows) ? rows : [], total });
  } catch {
    return fail("failed to get record list", 500);
  }
}
