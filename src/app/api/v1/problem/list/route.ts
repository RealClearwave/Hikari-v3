import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url, "http://localhost");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const size = Math.min(100, Math.max(1, Number(searchParams.get("size") || 20)));
    const keyword = (searchParams.get("keyword") || "").trim();
    const tagId = Number(searchParams.get("tag_id") || 0);

    const authToken = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = authToken ? verifyToken(authToken) : null;
    const isAdmin = claims?.role === 1;

    const whereParts: string[] = [];
    const params: Array<string | number> = [];
    let tagJoin = "";

    if (!isAdmin) {
      whereParts.push("p.is_public = ?");
      params.push(1);
    }
    if (keyword) {
      whereParts.push("p.title LIKE ?");
      params.push(`%${keyword}%`);
    }
    if (tagId > 0) {
      tagJoin = "JOIN problem_tags pt ON pt.problem_id = p.id";
      whereParts.push("pt.tag_id = ?");
      params.push(tagId);
    }

    const whereSQL = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM problems p ${tagJoin} ${whereSQL}`,
      params,
    );

    const total = Array.isArray(countRows) && countRows.length > 0 ? Number((countRows[0] as { total: number }).total) : 0;

    const offset = (page - 1) * size;
    const [listRows] = await db.query(
      `
      SELECT p.id, p.title, p.description, p.input_format, p.output_format,
             p.sample_cases, p.time_limit, p.memory_limit,
             p.difficulty, p.is_public, p.created_by, p.created_at, p.updated_at
      FROM problems p
      ${tagJoin}
      ${whereSQL}
      ORDER BY p.id ASC
      LIMIT ? OFFSET ?
      `,
      [...params, size, offset],
    );

    const problems = Array.isArray(listRows) ? listRows as Array<{ id: number }> : [];
    const problemIds = problems.map((p) => p.id);

    // Fetch tags for all returned problems
    const tagsByProblem: Record<number, Array<{ id: number; name: string; color: string }>> = {};
    if (problemIds.length > 0) {
      const placeholders = problemIds.map(() => "?").join(",");
      const [tagRows] = await db.query(
        `SELECT pt.problem_id, t.id, t.name, t.color
         FROM problem_tags pt
         JOIN tags t ON t.id = pt.tag_id
         WHERE pt.problem_id IN (${placeholders})
         ORDER BY t.name`,
        problemIds,
      );
      const rows = Array.isArray(tagRows) ? tagRows as Array<{ problem_id: number; id: number; name: string; color: string }> : [];
      for (const row of rows) {
        if (!tagsByProblem[row.problem_id]) tagsByProblem[row.problem_id] = [];
        tagsByProblem[row.problem_id].push({ id: row.id, name: row.name, color: row.color });
      }
    }

    return success({
      list: problems.map((p) => ({ ...p, tags: tagsByProblem[p.id] || [] })),
      total,
    });
  } catch {
    return fail("failed to get problem list", 500);
  }
}
