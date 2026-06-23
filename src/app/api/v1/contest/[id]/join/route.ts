import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";

// POST /api/v1/contest/[id]/join — join a contest (password check + registration)
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims) {
      return fail("unauthorized", 401);
    }

    const { id } = await ctx.params;
    const contestId = Number(id);
    if (!Number.isFinite(contestId) || contestId <= 0) {
      return fail("invalid contest id", 400);
    }

    // Check contest exists and get its info
    const [contestRows] = await db.query(
      "SELECT id, password, start_time, end_time FROM contests WHERE id = ? LIMIT 1",
      [contestId],
    );
    const contest = Array.isArray(contestRows) && contestRows.length > 0
      ? (contestRows[0] as { id: number; password: string; start_time: string; end_time: string })
      : null;
    if (!contest) {
      return fail("contest not found", 404);
    }

    // Time window check: allow joining before start, block after end
    const now = new Date();
    const endTime = new Date(contest.end_time);
    if (now > endTime) {
      return fail("contest has ended", 403);
    }

    // Password check (only if contest has a password set)
    if (contest.password) {
      const body = await req.json();
      const providedPassword = String(body?.password || "").trim();
      if (providedPassword !== contest.password) {
        return fail("invalid contest password", 403);
      }
    }

    // Check if already joined
    const [existingRows] = await db.query(
      "SELECT id FROM contest_participants WHERE contest_id = ? AND user_id = ? LIMIT 1",
      [contestId, claims.user_id],
    );
    const alreadyJoined = Array.isArray(existingRows) && existingRows.length > 0;

    if (!alreadyJoined) {
      await db.query(
        "INSERT INTO contest_participants (contest_id, user_id) VALUES (?, ?)",
        [contestId, claims.user_id],
      );
    }

    return success({
      joined: true,
      contest_id: contestId,
      message: alreadyJoined ? "already joined" : "successfully joined",
    });
  } catch {
    return fail("failed to join contest", 500);
  }
}

// GET /api/v1/contest/[id]/join — check if user has joined
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims) {
      return fail("unauthorized", 401);
    }

    const { id } = await ctx.params;
    const contestId = Number(id);
    if (!Number.isFinite(contestId) || contestId <= 0) {
      return fail("invalid contest id", 400);
    }

    const [rows] = await db.query(
      "SELECT id FROM contest_participants WHERE contest_id = ? AND user_id = ? LIMIT 1",
      [contestId, claims.user_id],
    );

    return success({
      joined: Array.isArray(rows) && rows.length > 0,
      contest_id: contestId,
    });
  } catch {
    return fail("failed to check join status", 500);
  }
}
