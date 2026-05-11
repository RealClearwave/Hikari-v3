import { getLlmConfig } from "./config";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LlmResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// Models known to support reasoning/thinking — we disable it for latency
const REASONING_MODEL_PATTERNS = [
  /^o1/, /^o3/, /^o4/,
  /deepseek-r1/i, /deepseek-reasoner/i,
  /claude.*thinking/i,
];

function isReasoningModel(model: string): boolean {
  return REASONING_MODEL_PATTERNS.some((p) => p.test(model));
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }
): Promise<LlmResponse> {
  const config = await getLlmConfig();

  if (!config.apiKey) {
    throw new Error("LLM API key not configured");
  }

  const url = `${config.baseUrl}/chat/completions`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    // Lower temperature for faster, more deterministic output
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 2048,
    stream: false,
  };

  // Disable reasoning/thinking for known reasoning models
  if (isReasoningModel(config.model)) {
    // OpenAI reasoning models (o1/o3) ignore temperature, use max_completion_tokens instead
    if (/^o[134]/.test(config.model)) {
      delete body.temperature;
      body.max_completion_tokens = options?.maxTokens ?? 2048;
      delete body.max_tokens;
    }
    // DeepSeek reasoning models: set thinking to disabled
    if (/deepseek/.test(config.model.toLowerCase())) {
      body.thinking = { type: "disabled" };
    }
  }

  // AbortController with 55s timeout (route maxDuration is 60s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || "",
      model: data.model || config.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function chatCompletionStream(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<ReadableStream<Uint8Array>> {
  const config = await getLlmConfig();

  if (!config.apiKey) {
    throw new Error("LLM API key not configured");
  }

  const url = `${config.baseUrl}/chat/completions`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 2048,
    stream: true,
  };

  // Disable reasoning for known reasoning models
  if (isReasoningModel(config.model)) {
    if (/^o[134]/.test(config.model)) {
      delete body.temperature;
      body.max_completion_tokens = options?.maxTokens ?? 2048;
      delete body.max_tokens;
    }
    if (/deepseek/.test(config.model.toLowerCase())) {
      body.thinking = { type: "disabled" };
    }
  }

  const controller = new AbortController();
  // No timeout on stream — caller handles lifecycle
  (body as Record<string, unknown>)._signal = undefined; // signal isn't in the JSON body

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  return response.body;
}

export function isLlmConfigured(): Promise<boolean> {
  return getLlmConfig().then((c) => !!c.apiKey);
}
