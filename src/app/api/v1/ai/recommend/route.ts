import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { chatCompletion } from "@/server/ai/client";
import { buildRecommendPrompt } from "@/server/ai/prompts";
import { streamSSE } from "@/server/ai/stream-helper";
import { verifyAuthAndFeature } from "@/server/ai/route-helper";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await verifyAuthAndFeature(request, "recommend");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { stream = true } = body;

    const userId = auth.claims.user_id;

    const [statsRows] = await db.query(
      `SELECT
         COUNT(*) AS total_submissions,
         SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS total_accepted,
         SUM(CASE WHEN status = 2 AND p.difficulty = 1 THEN 1 ELSE 0 END) AS easy_accepted,
         SUM(CASE WHEN p.difficulty = 1 THEN 1 ELSE 0 END) AS easy_total,
         SUM(CASE WHEN status = 2 AND p.difficulty = 2 THEN 1 ELSE 0 END) AS medium_accepted,
         SUM(CASE WHEN p.difficulty = 2 THEN 1 ELSE 0 END) AS medium_total,
         SUM(CASE WHEN status = 2 AND p.difficulty = 3 THEN 1 ELSE 0 END) AS hard_accepted,
         SUM(CASE WHEN p.difficulty = 3 THEN 1 ELSE 0 END) AS hard_total
       FROM records r
       JOIN problems p ON p.id = r.problem_id
       WHERE r.user_id = ?`,
      [userId]
    );
    const stats = (statsRows as Array<{
      total_submissions: number; total_accepted: number;
      easy_accepted: number; easy_total: number;
      medium_accepted: number; medium_total: number;
      hard_accepted: number; hard_total: number;
    }>)[0];

    const [recentRows] = await db.query(
      `SELECT DISTINCT r.problem_id AS id, p.title,
              CASE WHEN EXISTS (SELECT 1 FROM records r2 WHERE r2.user_id = ? AND r2.problem_id = r.problem_id AND r2.status = 2) THEN 'AC' ELSE 'Attempted' END AS status
       FROM records r
       JOIN problems p ON p.id = r.problem_id
       WHERE r.user_id = ?
       ORDER BY r.id DESC
       LIMIT 10`,
      [userId, userId]
    );
    const recentProblems = (recentRows as Array<{ id: number; title: string; status: string }>);

    const [availableRows] = await db.query(
      `SELECT p.id, p.title, p.difficulty,
              COUNT(r.id) AS total_submissions,
              SUM(CASE WHEN r.status = 2 THEN 1 ELSE 0 END) AS ac_count
       FROM problems p
       LEFT JOIN records r ON r.problem_id = p.id
       WHERE p.is_public = 1 AND p.deleted_at IS NULL
         AND p.id NOT IN (
           SELECT DISTINCT problem_id FROM records WHERE user_id = ? AND status = 2
         )
       GROUP BY p.id, p.title, p.difficulty
       HAVING total_submissions > 0
       ORDER BY p.id
       LIMIT 50`,
      [userId]
    );
    const availableProblems = (availableRows as Array<{
      id: number; title: string; difficulty: number;
      total_submissions: number; ac_count: number;
    }>).map((p) => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      acRate: p.total_submissions > 0 ? (Number(p.ac_count) / Number(p.total_submissions)) * 100 : 0,
      totalSubmissions: Number(p.total_submissions),
    }));

    if (availableProblems.length < 5) {
      return fail("Not enough available problems for recommendation", 400);
    }

    const { system, user } = buildRecommendPrompt({
      userStats: {
        totalSubmissions: Number(stats.total_submissions),
        totalAccepted: Number(stats.total_accepted),
        easyAccepted: Number(stats.easy_accepted),
        easyTotal: Number(stats.easy_total),
        mediumAccepted: Number(stats.medium_accepted),
        mediumTotal: Number(stats.medium_total),
        hardAccepted: Number(stats.hard_accepted),
        hardTotal: Number(stats.hard_total),
        recentProblems,
      },
      availableProblems,
    });

    if (stream) {
      return streamSSE([
        { role: "system", content: system },
        { role: "user", content: user },
      ], { temperature: 0.7, maxTokens: 1024 });
    }

    const result = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.7, maxTokens: 1024 }
    );

    // Parse recommendation JSON
    let recommendations;
    try {
      const jsonStr = result.content.replace(/```json\s?/g, "").replace(/```\s?/g, "").trim();
      recommendations = JSON.parse(jsonStr);
    } catch {
      return success({ raw: result.content, model: result.model });
    }

    const enriched = (recommendations as Array<{ id: number; reason: string }>).map((rec) => {
      const p = availableProblems.find((ap) => ap.id === rec.id);
      return {
        id: rec.id,
        title: p?.title || `Problem #${rec.id}`,
        difficulty: p?.difficulty || 1,
        reason: rec.reason,
      };
    });

    return success({ recommendations: enriched, model: result.model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI recommendation failed";
    return fail(message, 500);
  }
}
