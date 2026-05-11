/**
 * Generic SSE streaming helper for AI endpoints.
 * Reads token-by-token from the server and calls onToken for each.
 * Returns the full accumulated text when the stream completes.
 */
export async function streamAiResponse(
  endpoint: string,
  body: Record<string, unknown>,
  onToken: (token: string) => void
): Promise<string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const response = await fetch(`/api/v1${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!response.ok) {
    const text = await response.text();
    let msg = `HTTP ${response.status}`;
    try {
      const json = JSON.parse(text);
      msg = json.msg || msg;
    } catch {
      // use raw text
    }
    throw new Error(msg);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

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

      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.token) {
          fullText += parsed.token;
          onToken(parsed.token);
        } else if (parsed.done) {
          // stream complete
        } else if (parsed.error) {
          throw new Error(parsed.error);
        }
      } catch (err) {
        if (err instanceof Error && err.message !== "stream complete") {
          throw err;
        }
      }
    }
  }

  return fullText;
}
