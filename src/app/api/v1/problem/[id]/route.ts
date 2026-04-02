import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";
import { migrateDbSampleCasesIfNeeded } from "@/server/problem_samples";

interface ProblemDetailRow {
  id: number;
  is_public: number | boolean;
  sample_cases: unknown;
  submission_count: number;
  accepted_count: number;
  acceptance_rate?: number;
}

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
      SELECT
        p.id,
        p.title,
        p.description,
        p.input_format,
        p.output_format,
        p.sample_cases,
        p.time_limit,
        p.memory_limit,
        p.difficulty,
        p.is_public,
        p.created_by,
        p.created_at,
        p.updated_at,
        u.username AS created_by_name,
        COALESCE(s.submission_count, 0) AS submission_count,
        COALESCE(s.accepted_count, 0) AS accepted_count
      FROM problems
      p
      LEFT JOIN users u ON u.id = p.created_by
      LEFT JOIN (
        SELECT
          problem_id,
          COUNT(*) AS submission_count,
          SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS accepted_count
        FROM records
        GROUP BY problem_id
      ) s ON s.problem_id = p.id
      WHERE p.id = ?
      LIMIT 1
      `,
      [problemId],
    );

    const problem = Array.isArray(rows) && rows.length > 0
      ? (rows[0] as ProblemDetailRow)
      : null;
    if (!problem) {
      return fail("problem not found", 404);
    }
    if (!isAdmin && !Boolean(problem.is_public)) {
      return fail("problem is private", 404);
    }

    const sampleCases = await migrateDbSampleCasesIfNeeded(problem.id, problem.sample_cases);
    problem.sample_cases = JSON.stringify(sampleCases);
    const submissions = Number(problem.submission_count || 0);
    const accepted = Number(problem.accepted_count || 0);
    problem.acceptance_rate = submissions > 0
      ? Number(((accepted / submissions) * 100).toFixed(1))
      : 0;

    return success(problem);
  } catch {
    return fail("failed to get problem detail", 500);
  }
}
