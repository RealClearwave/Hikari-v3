import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { ensureUserMetaColumns } from "@/server/user_meta";

interface ContestRow {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  type: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator_name: string;
  creator_role: number;
  creator_badge: string;
  creator_accepted_count: number;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureUserMetaColumns();

    const { id } = await ctx.params;
    const contestId = Number(id);
    if (!Number.isFinite(contestId) || contestId <= 0) {
      return fail("invalid contest id", 400);
    }

    const [contestRows] = await db.query(
      `
      SELECT
        c.id,
        c.title,
        c.description,
        c.start_time,
        c.end_time,
        c.type,
        c.created_by,
        c.created_at,
        c.updated_at,
        COALESCE(u.username, '') AS creator_name,
        COALESCE(u.role, 0) AS creator_role,
        COALESCE(u.badge, '') AS creator_badge,
        COALESCE(us.accepted_count, 0) AS creator_accepted_count
      FROM contests c
      LEFT JOIN users u ON u.id = c.created_by
      LEFT JOIN (
        SELECT user_id, SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS accepted_count
        FROM records
        GROUP BY user_id
      ) us ON us.user_id = c.created_by
      WHERE c.id = ?
      LIMIT 1
      `,
      [contestId],
    );

    const contest = Array.isArray(contestRows) && contestRows.length > 0
      ? (contestRows[0] as ContestRow)
      : null;
    if (!contest) {
      return fail("contest not found", 404);
    }

    const [problemRows] = await db.query(
      `
      SELECT
        cp.problem_id,
        cp.display_id,
        p.title,
        COALESCE(SUM(CASE WHEN r.status = 2 THEN 1 ELSE 0 END), 0) AS ac_count,
        COALESCE(COUNT(r.id), 0) AS submit_count
      FROM contest_problems cp
      LEFT JOIN problems p ON p.id = cp.problem_id
      LEFT JOIN records r ON r.contest_id = cp.contest_id AND r.problem_id = cp.problem_id
      WHERE cp.contest_id = ?
      GROUP BY cp.problem_id, cp.display_id, p.title
      ORDER BY cp.display_id ASC
      `,
      [contestId],
    );

    const [submissionRows] = await db.query(
      `
      SELECT
        r.id,
        r.user_id,
        COALESCE(u.username, '') AS username,
        COALESCE(u.role, 0) AS role,
        COALESCE(u.badge, '') AS badge,
        COALESCE(us.accepted_count, 0) AS accepted_count,
        r.problem_id,
        COALESCE(cp.display_id, '') AS display_id,
        r.language,
        r.status,
        r.time_used,
        r.memory_used,
        r.created_at
      FROM records r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN (
        SELECT user_id, SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS accepted_count
        FROM records
        GROUP BY user_id
      ) us ON us.user_id = r.user_id
      LEFT JOIN contest_problems cp ON cp.contest_id = r.contest_id AND cp.problem_id = r.problem_id
      WHERE r.contest_id = ?
      ORDER BY r.id DESC
      LIMIT 100
      `,
      [contestId],
    );

    const [standingRows] = await db.query(
      `
      SELECT
        r.user_id,
        COALESCE(u.username, '') AS username,
        COALESCE(u.role, 0) AS role,
        COALESCE(u.badge, '') AS badge,
        COALESCE(COUNT(DISTINCT CASE WHEN r.status = 2 THEN r.problem_id END), 0) AS solved,
        COALESCE(SUM(CASE WHEN r.status = 2 THEN 1 ELSE 0 END), 0) AS accepted,
        COALESCE(COUNT(r.id), 0) AS submissions,
        COALESCE(SUM(CASE WHEN r.status != 2 THEN 1 ELSE 0 END), 0) AS wrong_attempts
      FROM records r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.contest_id = ?
      GROUP BY r.user_id, u.username, u.role, u.badge
      ORDER BY solved DESC, submissions ASC, r.user_id ASC
      LIMIT 200
      `,
      [contestId],
    );

    return success({
      contest,
      problems: Array.isArray(problemRows) ? problemRows : [],
      submissions: Array.isArray(submissionRows) ? submissionRows : [],
      standings: Array.isArray(standingRows) ? standingRows : [],
    });
  } catch {
    return fail("failed to get contest detail", 500);
  }
}
