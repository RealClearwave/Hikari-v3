import { db } from "@/server/db";
import { ensureUserMetaColumns } from "@/server/user_meta";

const ACM_PENALTY_MINUTES = 20;

// GET /api/v1/contest/[id]/standings-stream — SSE real-time standings
// No external deps: uses ReadableStream + TextEncoder (built-in)
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const contestId = Number(id);
  if (!Number.isFinite(contestId) || contestId <= 0) {
    return new Response("invalid contest id", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let running = true;
      const abortController = new AbortController();

      // Cleanup on client disconnect
      if (typeof _ !== 'undefined' && 'signal' in _) {
        (_ as Request).signal.addEventListener('abort', () => {
          running = false;
          abortController.abort();
        });
      }

      // Send keepalive + updated standings every N seconds
      const sendStandings = async () => {
        if (!running) return;

        try {
          await ensureUserMetaColumns();

          // Get contest info for start time
          const [contestRows] = await db.query(
            "SELECT start_time FROM contests WHERE id = ? LIMIT 1",
            [contestId],
          );
          if (!Array.isArray(contestRows) || contestRows.length === 0) {
            controller.enqueue(encoder.encode("event: error\ndata: contest not found\n\n"));
            controller.close();
            return;
          }

          const contestStart = new Date(
            (contestRows[0] as { start_time: string }).start_time,
          ).getTime();

          // Get all contest records ordered by time
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

          // Get problem display IDs
          const [problemRows] = await db.query(
            `
            SELECT cp.problem_id, cp.display_id
            FROM contest_problems cp
            WHERE cp.contest_id = ?
            ORDER BY cp.display_id ASC
            `,
            [contestId],
          );

          // Get user info for all participants
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

          // Build standings
          const userMap = new Map<number, {
            user_id: number;
            username: string;
            role: number;
            badge: string;
            solved: number;
            penalty: number;
            problems: Record<number, { display_id: string; attempts: number; solved: boolean; solve_time_minutes: number }>;
          }>();

          if (Array.isArray(userRows)) {
            for (const u of userRows as Array<{ user_id: number; username: string; role: number; badge: string }>) {
              userMap.set(u.user_id, {
                user_id: u.user_id,
                username: u.username,
                role: u.role,
                badge: u.badge,
                solved: 0,
                penalty: 0,
                problems: {},
              });
            }
          }

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
              if (!user.problems[pid]) {
                user.problems[pid] = {
                  display_id: rec.display_id || problemDisplayMap[pid] || String(pid),
                  attempts: 0,
                  solved: false,
                  solve_time_minutes: 0,
                };
              }

              const up = user.problems[pid];
              if (up.solved) continue;
              up.attempts++;

              if (rec.status === 2) {
                up.solved = true;
                user.solved++;
                const solveMs = new Date(rec.created_at).getTime() - contestStart;
                up.solve_time_minutes = Math.max(1, Math.round(solveMs / 60000));
                user.penalty += up.solve_time_minutes + ACM_PENALTY_MINUTES * (up.attempts - 1);
              }
            }
          }

          // Sort standings
          const standings = Array.from(userMap.values())
            .sort((a, b) => {
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
              problems: u.problems,
            }));

          // Send SSE event
          const data = JSON.stringify({
            standings,
            updated_at: new Date().toISOString(),
            total_users: standings.length,
          });

          controller.enqueue(encoder.encode(`event: standings\ndata: ${data}\n\n`));
        } catch (err) {
          if (running) {
            const msg = err instanceof Error ? err.message : 'internal error';
            controller.enqueue(encoder.encode(`event: error\ndata: ${msg}\n\n`));
          }
        }
      };

      // Send initial data immediately
      await sendStandings();

      // Then poll every 5 seconds
      const interval = setInterval(async () => {
        if (!running) {
          clearInterval(interval);
          return;
        }
        await sendStandings();
      }, 5000);

      // Keep alive with heartbeat every 30s
      const heartbeat = setInterval(() => {
        if (!running) {
          clearInterval(heartbeat);
          return;
        }
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30000);

      // Wait for disconnect
      return new Promise<void>((resolve) => {
        const checkRunning = setInterval(() => {
          if (!running || controller.desiredSize === null) {
            clearInterval(checkRunning);
            clearInterval(interval);
            clearInterval(heartbeat);
            resolve();
          }
        }, 5000);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx
    },
  });
}
