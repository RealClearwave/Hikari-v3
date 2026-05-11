import { chatCompletion, chatCompletionStream } from "./client";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Wraps the LLM stream into an SSE (Server-Sent Events) Response.
 * Parses OpenAI-compatible streaming chunks and re-emits them as:
 *   data: {"token": "..."}\n\n
 *   data: {"done": true}\n\n   (when complete)
 *   data: {"error": "..."}\n\n  (on failure)
 */
export async function streamSSE(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<Response> {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const llmStream = await chatCompletionStream(messages, options);
        const reader = llmStream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;
              const content = delta.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token: content })}\n\n`)
                );
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Non-streaming fallback — returns the same SSE format but as a single token + done.
 */
export async function streamSSEFromSync(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<Response> {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const result = await chatCompletion(messages, options);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ token: result.content })}\n\n`)
        );
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
