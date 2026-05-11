import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { chatCompletion } from "@/server/ai/client";
import { buildAnalyzeErrorPrompt } from "@/server/ai/prompts";
import { streamSSE } from "@/server/ai/stream-helper";
import { verifyAuthAndFeature } from "@/server/ai/route-helper";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await verifyAuthAndFeature(request, "analyzeError");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { recordId, stream = true } = body;

    if (!recordId) {
      return fail("recordId is required", 400);
    }

    const [recordRows] = await db.query(
      `SELECT r.*, p.title AS problem_title, p.description AS problem_description,
              p.input_format, p.output_format, p.time_limit, p.memory_limit
       FROM records r
       JOIN problems p ON p.id = r.problem_id
       WHERE r.id = ?`,
      [recordId]
    );
    const records = recordRows as Array<{
      id: number; code: string; language: string; status: number;
      error_info: string; problem_title: string; problem_description: string;
      input_format: string; output_format: string; time_limit: number; memory_limit: number;
    }>;
    if (records.length === 0) {
      return fail("Record not found", 404);
    }

    const record = records[0];

    const statusLabels: Record<number, string> = {
      2: "Accepted", 3: "Wrong Answer", 4: "Time Limit Exceeded",
      5: "Memory Limit Exceeded", 6: "Runtime Error", 7: "Compile Error",
    };

    const statusName = statusLabels[record.status] || `Status ${record.status}`;

    const { system, user } = buildAnalyzeErrorPrompt({
      code: record.code,
      language: record.language,
      status: statusName,
      errorInfo: record.error_info || "",
      problemTitle: record.problem_title,
      problemDescription: record.problem_description || "",
      inputFormat: record.input_format || "",
      outputFormat: record.output_format || "",
      timeLimit: record.time_limit,
      memoryLimit: record.memory_limit,
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

    return success({ analysis: result.content, model: result.model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI analysis failed";
    return fail(message, 500);
  }
}
