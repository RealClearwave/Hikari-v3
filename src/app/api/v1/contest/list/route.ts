import { db } from "@/server/db";
import { fail, success } from "@/server/response";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const size = Math.min(100, Math.max(1, Number(searchParams.get("size") || 20)));

    const [countRows] = await db.query("SELECT COUNT(*) AS total FROM contests");
    const total = Array.isArray(countRows) && countRows.length > 0 ? Number((countRows[0] as { total: number }).total) : 0;

    const offset = (page - 1) * size;
    const [rows] = await db.query(
      `
      SELECT id, title, description, start_time, end_time, type, created_by, created_at, updated_at
      FROM contests
      ORDER BY id DESC
      LIMIT ? OFFSET ?
      `,
      [size, offset],
    );

    return success({ list: Array.isArray(rows) ? rows : [], total });
  } catch {
    return fail("failed to get contest list", 500);
  }
}
