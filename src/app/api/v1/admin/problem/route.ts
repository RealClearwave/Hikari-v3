import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";
import { saveProblemSampleCases } from "@/server/problem_samples";

export async function POST(req: Request) {
  try {
    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims || claims.role !== 1) {
      return fail("forbidden", 403);
    }

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const inputFormat = String(body?.input_format || "");
    const outputFormat = String(body?.output_format || "");
    const sampleCases = body?.sample_cases || [];
    const timeLimit = Number(body?.time_limit || 0);
    const memoryLimit = Number(body?.memory_limit || 0);
    const difficulty = Number(body?.difficulty || 0);
    const isPublic = body?.is_public !== false;
    const tagIds: number[] = Array.isArray(body?.tag_ids) ? body.tag_ids : [];

    if (!title || !description || timeLimit < 100 || memoryLimit < 1024 || ![1, 2, 3].includes(difficulty)) {
      return fail("invalid parameters", 400);
    }

    const [, info] = await db.query(
      `INSERT INTO problems (
        title, description, input_format, output_format, sample_cases,
        time_limit, memory_limit, difficulty, is_public, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [title, description, inputFormat, outputFormat, JSON.stringify([]), timeLimit, memoryLimit, difficulty, isPublic ? 1 : 0, claims.user_id],
    );

    const problemId = info?.insertId ?? 0;
    if (problemId <= 0) {
      return fail("failed to create problem", 500);
    }

    // Save sample cases
    try {
      await saveProblemSampleCases(problemId, sampleCases);
    } catch {
      await db.query("DELETE FROM problems WHERE id = ?", [problemId]);
      return fail("failed to save sample cases", 500);
    }

    // Link tags
    if (tagIds.length > 0) {
      const placeholders = tagIds.map(() => "(?, ?)").join(", ");
      const params: number[] = [];
      tagIds.forEach((tid) => params.push(problemId, tid));
      await db.query(
        `INSERT OR IGNORE INTO problem_tags (problem_id, tag_id) VALUES ${placeholders}`,
        params,
      );
    }

    return success({ id: problemId });
  } catch {
    return fail("failed to create problem", 500);
  }
}
