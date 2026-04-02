import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const size = Math.min(100, Math.max(1, Number(searchParams.get("size") || 20)));
    const keyword = (searchParams.get("keyword") || "").trim();

    const authToken = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = authToken ? verifyToken(authToken) : null;
    const isAdmin = claims?.role === 1;

    const whereParts: string[] = [];
    const params: Array<string | number | boolean> = [];

    if (!isAdmin) {
      whereParts.push("is_public = ?");
      params.push(true);
    }
    if (keyword) {
      whereParts.push("title LIKE ?");
      params.push(`%${keyword}%`);
    }

    const whereSQL = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM problems ${whereSQL}`,
      params,
    );

    const total = Array.isArray(countRows) && countRows.length > 0 ? Number((countRows[0] as { total: number }).total) : 0;

    const offset = (page - 1) * size;
    const [listRows] = await db.query(
      `
      SELECT id, title, description, input_format, output_format, sample_cases, time_limit, memory_limit,
             difficulty, is_public, created_by, created_at, updated_at
      FROM problems
      ${whereSQL}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
      `,
      [...params, size, offset],
    );

    return success({
      list: Array.isArray(listRows) ? listRows : [],
      total,
    });
  } catch {
    return fail("failed to get problem list", 500);
  }
}
