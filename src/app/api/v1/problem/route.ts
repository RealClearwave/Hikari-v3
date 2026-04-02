import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";
import { saveProblemSampleCases } from "@/server/problem_samples";

export async function POST(req: Request) {
  try {
    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;

    if (!claims) {
      return fail("unauthorized", 401);
    }
    if (claims.role !== 1) {
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
    const isPublic = Boolean(body?.is_public);

    if (!title || !description || timeLimit < 100 || memoryLimit < 1024 || ![1, 2, 3].includes(difficulty)) {
      return fail("invalid parameters", 400);
    }

    const [result] = await db.query(
      `
      INSERT INTO problems (
        title, description, input_format, output_format, sample_cases,
        time_limit, memory_limit, difficulty, is_public, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [title, description, inputFormat, outputFormat, JSON.stringify([]), timeLimit, memoryLimit, difficulty, isPublic, claims.user_id],
    );

    const problemId = typeof result === "object" && result && "insertId" in result
      ? Number((result as { insertId: number }).insertId)
      : 0;

    if (problemId <= 0) {
      return fail("failed to create problem", 500);
    }

    try {
      await saveProblemSampleCases(problemId, sampleCases);
    } catch {
      await db.query("DELETE FROM problems WHERE id = ?", [problemId]);
      return fail("failed to save sample cases", 500);
    }

    return success({ msg: "problem created successfully", id: problemId });
  } catch {
    return fail("failed to create problem", 500);
  }
}
