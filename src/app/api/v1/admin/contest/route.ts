import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";

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
    const startTime = String(body?.start_time || "").trim();
    const endTime = String(body?.end_time || "").trim();
    const type = Number(body?.type || 0);
    const password = String(body?.password || "").trim();
    const problemIds: number[] = Array.isArray(body?.problem_ids) ? body.problem_ids : [];

    if (!title || !startTime || !endTime) {
      return fail("title, start_time, end_time are required", 400);
    }
    if (new Date(endTime) <= new Date(startTime)) {
      return fail("end_time must be after start_time", 400);
    }

    const [, info] = await db.query(
      `INSERT INTO contests (title, description, start_time, end_time, type, password, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description, startTime, endTime, type, password, claims.user_id],
    );

    const contestId = info?.insertId ?? 0;
    if (contestId <= 0) {
      return fail("failed to create contest", 500);
    }

    // Insert contest problems
    if (problemIds.length > 0) {
      const placeholders = problemIds.map(() => "(?, ?, ?)").join(", ");
      const params: (string | number)[] = [];
      problemIds.forEach((pid, i) => {
        params.push(contestId, pid, String.fromCharCode(65 + i)); // A, B, C, ...
      });
      await db.query(
        `INSERT INTO contest_problems (contest_id, problem_id, display_id) VALUES ${placeholders}`,
        params,
      );
    }

    return success({ id: contestId });
  } catch {
    return fail("failed to create contest", 500);
  }
}
