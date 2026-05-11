import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { chatCompletion } from "@/server/ai/client";
import { buildGenerateSolutionPrompt } from "@/server/ai/prompts";
import { streamSSE } from "@/server/ai/stream-helper";
import { verifyAuthAndFeature } from "@/server/ai/route-helper";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await verifyAuthAndFeature(request, "generateSolution");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { problemId, code, language, stream = true } = body;

    if (!problemId) {
      return fail("problemId is required", 400);
    }

    const [problemRows] = await db.query(
      "SELECT title, description, input_format, output_format FROM problems WHERE id = ?",
      [problemId]
    );
    const problems = problemRows as Array<{
      title: string; description: string; input_format: string; output_format: string;
    }>;
    if (problems.length === 0) {
      return fail("Problem not found", 404);
    }

    const problem = problems[0];

    const { system, user } = buildGenerateSolutionPrompt({
      problemTitle: problem.title,
      problemDescription: problem.description || "",
      inputFormat: problem.input_format || "",
      outputFormat: problem.output_format || "",
      code: code || "",
      language: language || "cpp",
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
      solution: result.content,
      model: result.model,
      title: `${problem.title} - 题解`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return fail(message, 500);
  }
}
