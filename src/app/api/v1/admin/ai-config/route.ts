import { fail, success } from "@/server/response";
import { getLlmConfig, updateLlmConfig } from "@/server/ai/config";
import { verifyAdmin } from "@/server/ai/route-helper";

export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin(request);
    if (auth instanceof Response) return auth;

    const config = await getLlmConfig();

    // Don't return full API key
    const maskedKey = config.apiKey
      ? config.apiKey.slice(0, 4) + "****" + config.apiKey.slice(-4)
      : "";

    return success({
      provider: config.provider,
      apiKey: maskedKey,
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      features: config.features,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get config";
    return fail(message, 500);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await verifyAdmin(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();

    await updateLlmConfig({
      provider: body.provider,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      model: body.model,
      featureAnalyzeError: body.featureAnalyzeError,
      featureGenerateSolution: body.featureGenerateSolution,
      featureGenerateProblem: body.featureGenerateProblem,
      featureContestAnalysis: body.featureContestAnalysis,
      featureExplainCode: body.featureExplainCode,
      featureRecommend: body.featureRecommend,
      featureSummarizeArticle: body.featureSummarizeArticle,
    });

    const config = await getLlmConfig();
    return success({
      provider: config.provider,
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      features: config.features,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update config";
    return fail(message, 500);
  }
}
