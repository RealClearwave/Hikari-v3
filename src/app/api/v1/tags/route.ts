import { db } from "@/server/db";
import { fail, success } from "@/server/response";

export async function GET() {
  try {
    const [rows] = await db.query(
      `SELECT t.*, COUNT(pt.problem_id) AS problem_count
       FROM tags t
       LEFT JOIN problem_tags pt ON pt.tag_id = t.id
       GROUP BY t.id
       ORDER BY t.name ASC`,
      []
    );
    return success({ list: Array.isArray(rows) ? rows : [] });
  } catch {
    return fail("failed to get tags", 500);
  }
}
