import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { ensureUserMetaColumns } from "@/server/user_meta";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";

interface ContestRow {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  type: number;
  password: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator_name: string;
  creator_role: number;
  creator_badge: string;
  creator_accepted_count: number;
}

// ACM penalty: 20 minutes per wrong attempt before first AC on each problem
const ACM_PENALTY_MINUTES = 20;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureUserMetaColumns();

    // Parse current user (optional)
    const authToken = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = authToken ? verifyToken(authToken) : null;
    const currentUserId = claims?.user_id ?? 0;

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
        c.password,
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

    // Check if current user has joined (only relevant if password is set)
    let userJoined = true; // default true for public contests
    if (contest.password) {
      if (currentUserId > 0) {
        const [joinRows] = await db.query(
          "SELECT id FROM contest_participants WHERE contest_id = ? AND user_id = ? LIMIT 1",
          [contestId, currentUserId],
        );
        userJoined = Array.isArray(joinRows) && joinRows.length > 0;
      } else {
        userJoined = false;
      }
    }

    // Get participant count
    const [countRows] = await db.query(
      "SELECT COUNT(*) AS cnt FROM contest_participants WHERE contest_id = ?",
      [contestId],
    );
    const participantCount = Array.isArray(countRows) && countRows.length > 0
      ? Number((countRows[0] as { cnt: number }).cnt)
      : 0;

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

    // Compute ACM-style standings with per-problem breakdown and penalty time
    const [allRecords] = await db.query(
      `
      SELECT r.user_id, r.problem_id, r.status, r.created_at,
             COALESCE(cp.display_id, '') AS display_id
      FROM records r
      LEFT JOIN contest_problems cp ON cp.contest_id = r.contest_id AND cp.problem_id = r.problem_id
      WHERE r.contest_id = ?
      ORDER BY r.created_at ASC
      `,
      [contestId],
    );

    // Build standings map
    const userMap = new Map<number, {
      user_id: number;
      username: string;
      role: number;
      badge: string;
      solved: number;
      penalty: number; // ACM penalty time in minutes
      submissions: number;
      problems: Record<string, {
        display_id: string;
        attempts: number;
        solved: boolean;
        solve_time_minutes: number;
      }>;
    }>();

    // Get all users who participated
    const [userRows] = await db.query(
      `
      SELECT DISTINCT r.user_id, COALESCE(u.username, '') AS username,
             COALESCE(u.role, 0) AS role, COALESCE(u.badge, '') AS badge
      FROM records r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.contest_id = ?
      `,
      [contestId],
    );

    const contestStart = new Date(contest.start_time).getTime();

    if (Array.isArray(userRows)) {
      for (const row of userRows as Array<{ user_id: number; username: string; role: number; badge: string }>) {
        userMap.set(row.user_id, {
          user_id: row.user_id,
          username: row.username,
          role: row.role,
          badge: row.badge,
          solved: 0,
          penalty: 0,
          submissions: 0,
          problems: {},
        });
      }
    }

    // Get problem display_ids
    const problemDisplayMap: Record<number, string> = {};
    if (Array.isArray(problemRows)) {
      for (const p of problemRows as Array<{ problem_id: number; display_id: string }>) {
        problemDisplayMap[p.problem_id] = p.display_id;
      }
    }

    if (Array.isArray(allRecords)) {
      for (const rec of allRecords as Array<{ user_id: number; problem_id: number; status: number; created_at: string; display_id: string }>) {
        const user = userMap.get(rec.user_id);
        if (!user) continue;

        const pid = rec.problem_id;
        const displayId = rec.display_id || problemDisplayMap[pid] || String(pid);

        if (!user.problems[pid]) {
          user.problems[pid] = {
            display_id: displayId,
            attempts: 0,
            solved: false,
            solve_time_minutes: 0,
          };
        }

        const up = user.problems[pid];
        user.submissions++;

        if (up.solved) continue; // already solved, skip further records for penalty

        up.attempts++;

        if (rec.status === 2) {
          // Accepted!
          up.solved = true;
          user.solved++;

          const solveTimeMs = new Date(rec.created_at).getTime() - contestStart;
          const solveTimeMinutes = Math.max(1, Math.round(solveTimeMs / 60000));

          up.solve_time_minutes = solveTimeMinutes;
          // ACM penalty = solve time + 20min * (wrong attempts before AC)
          user.penalty += solveTimeMinutes + ACM_PENALTY_MINUTES * (up.attempts - 1);
        }
      }
    }

    // Build sorted standings array
    const standings = Array.from(userMap.values())
      .sort((a, b) => {
        // ACM rules: more solved first, then less penalty
        if (b.solved !== a.solved) return b.solved - a.solved;
        return a.penalty - b.penalty;
      })
      .map((u, idx) => ({
        rank: idx + 1,
        user_id: u.user_id,
        username: u.username,
        role: u.role,
        badge: u.badge,
        solved: u.solved,
        penalty: u.penalty,
        submissions: u.submissions,
        problems: u.problems,
      }));

    return success({
      contest: {
        ...contest,
        has_password: !!contest.password,
        participant_count: participantCount,
      },
      user_joined: userJoined,
      problems: Array.isArray(problemRows) ? problemRows : [],
      submissions: Array.isArray(submissionRows) ? submissionRows : [],
      standings,
    });
  } catch {
    return fail("failed to get contest detail", 500);
  }
}
