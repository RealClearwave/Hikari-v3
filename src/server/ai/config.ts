import { db } from "@/server/db";

export interface LlmConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  features: {
    analyzeError: boolean;
    generateSolution: boolean;
    generateProblem: boolean;
    contestAnalysis: boolean;
    explainCode: boolean;
    recommend: boolean;
    summarizeArticle: boolean;
  };
}

async function getConfigValue(key: string): Promise<string> {
  const [rows] = await db.query(
    "SELECT config_value FROM system_config WHERE config_key = ?",
    [key]
  );
  const arr = rows as Array<{ config_value: string }>;
  return arr.length > 0 ? arr[0].config_value : "";
}

async function setConfigValue(key: string, value: string): Promise<void> {
  await db.query(
    "INSERT INTO system_config (config_key, config_value) VALUES (?, ?) ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value",
    [key, value]
  );
}

export async function getLlmConfig(): Promise<LlmConfig> {
  const [provider, apiKey, baseUrl, model, analyzeError, generateSolution, generateProblem, contestAnalysis, explainCode, recommend, summarizeArticle] =
    await Promise.all([
      getConfigValue("llm_provider"),
      getConfigValue("llm_api_key"),
      getConfigValue("llm_base_url"),
      getConfigValue("llm_model"),
      getConfigValue("llm_feature_analyze_error"),
      getConfigValue("llm_feature_generate_solution"),
      getConfigValue("llm_feature_generate_problem"),
      getConfigValue("llm_feature_contest_analysis"),
      getConfigValue("llm_feature_explain_code"),
      getConfigValue("llm_feature_recommend"),
      getConfigValue("llm_feature_summarize_article"),
    ]);

  return {
    provider: provider || "openai",
    apiKey: apiKey || "",
    baseUrl: baseUrl || "https://api.openai.com/v1",
    model: model || "gpt-4o-mini",
    features: {
      analyzeError: analyzeError !== "false",
      generateSolution: generateSolution !== "false",
      generateProblem: generateProblem !== "false",
      contestAnalysis: contestAnalysis !== "false",
      explainCode: explainCode !== "false",
      recommend: recommend !== "false",
      summarizeArticle: summarizeArticle !== "false",
    },
  };
}

export async function updateLlmConfig(config: Partial<{
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  featureAnalyzeError: boolean;
  featureGenerateSolution: boolean;
  featureGenerateProblem: boolean;
  featureContestAnalysis: boolean;
  featureExplainCode: boolean;
  featureRecommend: boolean;
  featureSummarizeArticle: boolean;
}>): Promise<void> {
  const updates: Array<[string, string]> = [];
  if (config.provider !== undefined) updates.push(["llm_provider", config.provider]);
  if (config.apiKey !== undefined) updates.push(["llm_api_key", config.apiKey]);
  if (config.baseUrl !== undefined) updates.push(["llm_base_url", config.baseUrl]);
  if (config.model !== undefined) updates.push(["llm_model", config.model]);
  if (config.featureAnalyzeError !== undefined) updates.push(["llm_feature_analyze_error", String(config.featureAnalyzeError)]);
  if (config.featureGenerateSolution !== undefined) updates.push(["llm_feature_generate_solution", String(config.featureGenerateSolution)]);
  if (config.featureGenerateProblem !== undefined) updates.push(["llm_feature_generate_problem", String(config.featureGenerateProblem)]);
  if (config.featureContestAnalysis !== undefined) updates.push(["llm_feature_contest_analysis", String(config.featureContestAnalysis)]);
  if (config.featureExplainCode !== undefined) updates.push(["llm_feature_explain_code", String(config.featureExplainCode)]);
  if (config.featureRecommend !== undefined) updates.push(["llm_feature_recommend", String(config.featureRecommend)]);
  if (config.featureSummarizeArticle !== undefined) updates.push(["llm_feature_summarize_article", String(config.featureSummarizeArticle)]);

  for (const [key, value] of updates) {
    await setConfigValue(key, value);
  }
}
