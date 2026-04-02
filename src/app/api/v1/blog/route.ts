import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";
import { computeArticleKind, ensureArticleMetaColumns, normalizeTags, stringifyTags } from "@/server/article";

export async function POST(req: Request) {
  try {
    await ensureArticleMetaColumns();

    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims?.user_id) {
      return fail("unauthorized", 401);
    }

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const content = String(body?.content || "").trim();
    const tags = normalizeTags(body?.tags);
    const linkedProblemId = Number(body?.problem_id || 0);
    const { type, problemId } = computeArticleKind(tags, linkedProblemId);

    if (!title || !content) {
      return fail("title and content are required", 400);
    }
    if (title.length > 200) {
      return fail("title is too long", 400);
    }
    if (content.length > 20000) {
      return fail("content is too long", 400);
    }

    const [result] = await db.query(
      "INSERT INTO articles (user_id, title, content, type, problem_id, views, tags) VALUES (?, ?, ?, ?, ?, 0, ?)",
      [claims.user_id, title, content, type, problemId, stringifyTags(tags)],
    );

    const insertId = Number((result as { insertId?: number }).insertId || 0);
    return success({ id: insertId });
  } catch {
    return fail("failed to create blog", 500);
  }
}
