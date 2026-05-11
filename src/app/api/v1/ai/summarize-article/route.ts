import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { chatCompletion } from "@/server/ai/client";
import { buildSummarizeArticlePrompt } from "@/server/ai/prompts";
import { streamSSE } from "@/server/ai/stream-helper";
import { verifyAuthAndFeature } from "@/server/ai/route-helper";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await verifyAuthAndFeature(request, "summarizeArticle");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { articleId, stream = true } = body;

    if (!articleId) {
      return fail("articleId is required", 400);
    }

    // Fetch article
    const [articleRows] = await db.query(
      `SELECT a.title, a.content, u.username AS author_name
       FROM articles a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.id = ? AND a.type IN (0, 1)
       LIMIT 1`,
      [articleId]
    );
    const articles = articleRows as Array<{ title: string; content: string; author_name: string }>;
    if (articles.length === 0) {
      return fail("Article not found", 404);
    }
    const article = articles[0];

    // Fetch replies
    const [replyRows] = await db.query(
      `SELECT r.content, COALESCE(u.username, '匿名') AS username
       FROM article_replies r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.article_id = ? AND r.deleted_at IS NULL
       ORDER BY r.id ASC`,
      [articleId]
    );
    const replies = (replyRows as Array<{ content: string; username: string }>).map((r) => ({
      username: r.username,
      content: r.content,
    }));

    const { system, user } = buildSummarizeArticlePrompt({
      title: article.title,
      content: article.content,
      replies,
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
      summary: result.content,
      model: result.model,
      title: `${article.title} - 总结`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI summarization failed";
    return fail(message, 500);
  }
}
