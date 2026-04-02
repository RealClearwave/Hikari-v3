import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { ensureArticleMetaColumns, parseTagsField } from "@/server/article";

export async function GET(req: Request) {
  try {
    await ensureArticleMetaColumns();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const size = Math.min(100, Math.max(1, Number(searchParams.get("size") || 20)));
    const type = Number(searchParams.get("type") || -1);
    const problemId = Number(searchParams.get("problem_id") || 0);

    const whereParts: string[] = ["type IN (0, 1)"];
    const params: Array<number> = [];
    if (type === 0 || type === 1) {
      whereParts.push("type = ?");
      params.push(type);
    }
    if (problemId > 0) {
      whereParts.push("problem_id = ?");
      params.push(problemId);
    }
    const whereSQL = `WHERE ${whereParts.join(" AND ")}`;

    const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM articles ${whereSQL}`, params);
    const total = Array.isArray(countRows) && countRows.length > 0 ? Number((countRows[0] as { total: number }).total) : 0;

    const offset = (page - 1) * size;
    const [rows] = await db.query(
      `
      SELECT id, user_id, title, content, views, created_at, updated_at, type, problem_id, tags
      FROM articles
      ${whereSQL}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, size, offset],
    );

    const list = Array.isArray(rows)
      ? (rows as Array<Record<string, unknown>>).map((row) => ({
          ...row,
          tags: parseTagsField(row.tags),
        }))
      : [];

    return success({ list, total });
  } catch {
    return fail("failed to get blog list", 500);
  }
}
