import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";
import { migrateDbSampleCasesIfNeeded } from "@/server/problem_samples";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const problemId = Number(id);
    if (!Number.isFinite(problemId) || problemId <= 0) {
      return fail("invalid problem id", 400);
    }

    const authToken = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = authToken ? verifyToken(authToken) : null;
    const isAdmin = claims?.role === 1;

    const [rows] = await db.query(
      `
      SELECT id, title, description, input_format, output_format, sample_cases, time_limit, memory_limit,
             difficulty, is_public, created_by, created_at, updated_at
      FROM problems
      WHERE id = ?
      LIMIT 1
      `,
      [problemId],
    );

    const problem = Array.isArray(rows) && rows.length > 0
      ? (rows[0] as { id: number; is_public: number | boolean; sample_cases: unknown })
      : null;
    if (!problem) {
      return fail("problem not found", 404);
    }
    if (!isAdmin && !Boolean(problem.is_public)) {
      return fail("problem is private", 404);
    }

    const sampleCases = await migrateDbSampleCasesIfNeeded(problem.id, problem.sample_cases);
    problem.sample_cases = JSON.stringify(sampleCases);

    return success(problem);
  } catch {
    return fail("failed to get problem detail", 500);
  }
}
