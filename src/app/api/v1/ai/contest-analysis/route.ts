import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { chatCompletion } from "@/server/ai/client";
import { buildContestAnalysisPrompt } from "@/server/ai/prompts";
import { streamSSE } from "@/server/ai/stream-helper";
import { verifyAuthAndFeature } from "@/server/ai/route-helper";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await verifyAuthAndFeature(request, "contestAnalysis");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { contestId, stream = true } = body;

    if (!contestId) {
      return fail("contestId is required", 400);
    }

    const [contestRows] = await db.query(
      "SELECT id, title, description FROM contests WHERE id = ?",
      [contestId]
    );
    const contests = contestRows as Array<{ id: number; title: string; description: string }>;
    if (contests.length === 0) {
      return fail("Contest not found", 404);
    }
    const contest = contests[0];

    const [problemRows] = await db.query(
      `SELECT cp.display_id, p.title, p.id AS problem_id,
              COUNT(CASE WHEN r.status = 2 THEN 1 END) AS ac_count,
              COUNT(r.id) AS submit_count
       FROM contest_problems cp
       JOIN problems p ON p.id = cp.problem_id
       LEFT JOIN records r ON r.problem_id = p.id AND r.contest_id = cp.contest_id
       WHERE cp.contest_id = ?
       GROUP BY cp.display_id, p.title, p.id
       ORDER BY cp.display_id`,
      [contestId]
    );
    const problems = (problemRows as Array<{
      display_id: string; title: string; problem_id: number;
      ac_count: number; submit_count: number;
    }>).map((p) => ({
      displayId: p.display_id,
      title: p.title,
      acCount: Number(p.ac_count),
      submitCount: Number(p.submit_count),
    }));

    const [standingsRows] = await db.query(
      `SELECT u.username, us.solved, us.accepted, us.submissions
       FROM (
         SELECT r.user_id,
                COUNT(DISTINCT CASE WHEN r.status = 2 THEN r.problem_id END) AS solved,
                SUM(CASE WHEN r.status = 2 THEN 1 ELSE 0 END) AS accepted,
                COUNT(r.id) AS submissions
         FROM records r
         WHERE r.contest_id = ?
         GROUP BY r.user_id
         ORDER BY solved DESC, submissions ASC
         LIMIT 5
       ) us
       JOIN users u ON u.id = us.user_id`,
      [contestId]
    );
    const topUsers = (standingsRows as Array<{
      username: string; solved: number; accepted: number; submissions: number;
    }>).map((u) => ({
      username: u.username,
      solved: Number(u.solved),
      accepted: Number(u.accepted),
      submissions: Number(u.submissions),
    }));

    const [statsRows] = await db.query(
      `SELECT COUNT(DISTINCT user_id) AS participants, COUNT(*) AS total_subs
       FROM records WHERE contest_id = ?`,
      [contestId]
    );
    const stats = (statsRows as Array<{ participants: number; total_subs: number }>)[0] || { participants: 0, total_subs: 0 };

    const { system, user } = buildContestAnalysisPrompt({
      contestTitle: contest.title,
      contestDescription: contest.description || "",
      problems,
      topUsers,
      totalSubmissions: Number(stats.total_subs),
      totalParticipants: Number(stats.participants),
    });

    if (stream) {
      return streamSSE([
        { role: "system", content: system },
        { role: "user", content: user },
      ]);
    }

    const result = await chatCompletion([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    return success({
      analysis: result.content,
      model: result.model,
      title: `${contest.title} - 赛后分析`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI analysis failed";
    return fail(message, 500);
  }
}
