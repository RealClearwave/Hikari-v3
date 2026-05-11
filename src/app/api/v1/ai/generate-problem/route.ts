import { fail, success } from "@/server/response";
import { chatCompletion } from "@/server/ai/client";
import { buildGenerateProblemPrompt } from "@/server/ai/prompts";
import { streamSSE } from "@/server/ai/stream-helper";
import { verifyAuthAndFeature } from "@/server/ai/route-helper";
import { verifyToken, parseAuthorizationHeader } from "@/server/auth";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // Admin only
    const token = parseAuthorizationHeader(request.headers.get("Authorization"));
    if (!token) return fail("Authentication required", 401);
    const claims = verifyToken(token);
    if (!claims) return fail("Invalid token", 401);
    if (claims.role !== 1) return fail("Admin access required", 403);

    const auth = await verifyAuthAndFeature(request, "generateProblem");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { briefDescription, stream = true } = body;

    if (!briefDescription || briefDescription.trim().length < 10) {
      return fail("briefDescription must be at least 10 characters", 400);
    }

    const { system, user } = buildGenerateProblemPrompt({
      briefDescription: briefDescription.trim(),
    });

    if (stream) {
      return streamSSE([
        { role: "system", content: system },
        { role: "user", content: user },
      ], { temperature: 0.8, maxTokens: 4096 });
    }

    const result = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.8, maxTokens: 4096 }
    );

    // Try to parse JSON from the response
    let problemData;
    try {
      const jsonStr = result.content.replace(/```json\s?/g, "").replace(/```\s?/g, "").trim();
      problemData = JSON.parse(jsonStr);
    } catch {
      return success({ raw: result.content, model: result.model });
    }

    return success({ problem: problemData, model: result.model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return fail(message, 500);
  }
}
