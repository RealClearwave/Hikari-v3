import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { chatCompletion } from "@/server/ai/client";
import { buildExplainCodePrompt } from "@/server/ai/prompts";
import { streamSSE } from "@/server/ai/stream-helper";
import { verifyAuthAndFeature } from "@/server/ai/route-helper";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await verifyAuthAndFeature(request, "explainCode");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { recordId, code, language, stream = true } = body;

    let finalCode = code || "";
    let finalLang = language || "cpp";
    let problemTitle: string | undefined;

    if (recordId) {
      const [rows] = await db.query(
        `SELECT r.code, r.language, p.title AS problem_title
         FROM records r
         LEFT JOIN problems p ON p.id = r.problem_id
         WHERE r.id = ?`,
        [recordId]
      );
      const records = rows as Array<{ code: string; language: string; problem_title: string }>;
      if (records.length > 0) {
        finalCode = records[0].code;
        finalLang = records[0].language;
        problemTitle = records[0].problem_title || undefined;
      }
    }

    if (!finalCode.trim()) {
      return fail("code or recordId is required", 400);
    }

    const { system, user } = buildExplainCodePrompt({
      code: finalCode,
      language: finalLang,
      problemTitle,
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

    return success({ explanation: result.content, model: result.model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI explanation failed";
    return fail(message, 500);
  }
}
