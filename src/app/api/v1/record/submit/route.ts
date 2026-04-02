import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";

export async function POST(req: Request) {
  try {
    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims) {
      return fail("unauthorized", 401);
    }

    const body = await req.json();
    const problemId = Number(body?.problem_id || 0);
    const contestId = Number(body?.contest_id || 0);
    const language = String(body?.language || "").trim();
    const code = String(body?.code || "");
    const status = Number(body?.status ?? 0);
    const timeUsed = Number(body?.time_used ?? 0);
    const memoryUsed = Number(body?.memory_used ?? 0);
    const errorInfo = String(body?.error_info || "");

    if (problemId <= 0 || !language || !code) {
      return fail("invalid parameters", 400);
    }

    const [result] = await db.query(
      `
      INSERT INTO records (
        user_id, problem_id, contest_id, language, code, status, time_used, memory_used, error_info, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [claims.user_id, problemId, contestId, language, code, status, timeUsed, memoryUsed, errorInfo],
    );

    const insertId = typeof result === "object" && result && "insertId" in result ? Number((result as { insertId: number }).insertId) : 0;

    return success({ id: insertId, status });
  } catch {
    return fail("failed to submit record", 500);
  }
}
