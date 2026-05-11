import request, { ApiResponse } from "@/utils/request";

// AI calls can take 30-60s — override the default 10s timeout
const AI_TIMEOUT = 120000;

// Error Analysis
export interface AnalyzeErrorResponse {
  analysis: string;
  model: string;
}

export const analyzeError = (recordId: number): Promise<ApiResponse<AnalyzeErrorResponse>> => {
  return request.post("/ai/analyze-error", { recordId }, { timeout: AI_TIMEOUT });
};

// Solution Generation
export interface GenerateSolutionResponse {
  solution: string;
  model: string;
  title: string;
}

export const generateSolution = (
  problemId: number,
  code?: string,
  language?: string
): Promise<ApiResponse<GenerateSolutionResponse>> => {
  return request.post("/ai/generate-solution", { problemId, code, language }, { timeout: AI_TIMEOUT });
};

// Problem Generation (Admin)
export interface GeneratedProblem {
  title: string;
  description: string;
  input_format: string;
  output_format: string;
  sample_cases: Array<{ input: string; output: string }>;
  difficulty: number;
  time_limit: number;
  memory_limit: number;
  tags: string[];
}

export interface GenerateProblemResponse {
  problem: GeneratedProblem;
  model: string;
  raw?: string;
}

export const generateProblem = (
  briefDescription: string
): Promise<ApiResponse<GenerateProblemResponse>> => {
  return request.post("/ai/generate-problem", { briefDescription }, { timeout: AI_TIMEOUT });
};

// Contest Analysis
export interface ContestAnalysisResponse {
  analysis: string;
  model: string;
  title: string;
}

export const analyzeContest = (
  contestId: number
): Promise<ApiResponse<ContestAnalysisResponse>> => {
  return request.post("/ai/contest-analysis", { contestId }, { timeout: AI_TIMEOUT });
};

// Code Explanation
export interface ExplainCodeResponse {
  explanation: string;
  model: string;
}

export const explainCode = (params: {
  recordId?: number;
  code?: string;
  language?: string;
}): Promise<ApiResponse<ExplainCodeResponse>> => {
  return request.post("/ai/explain-code", params, { timeout: AI_TIMEOUT });
};

// Problem Recommendations
export interface RecommendedProblem {
  id: number;
  title: string;
  difficulty: number;
  reason: string;
}

export interface RecommendResponse {
  recommendations: RecommendedProblem[];
  model: string;
  raw?: string;
}

export const recommendProblems = (): Promise<ApiResponse<RecommendResponse>> => {
  return request.post("/ai/recommend", {}, { timeout: AI_TIMEOUT });
};

// Admin AI Config
export interface AiConfig {
  provider: string;
  apiKey: string;
  hasApiKey: boolean;
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

export const getAiConfig = (): Promise<ApiResponse<AiConfig>> => {
  return request.get("/admin/ai-config");
};

export const updateAiConfig = (config: {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  featureAnalyzeError?: boolean;
  featureGenerateSolution?: boolean;
  featureGenerateProblem?: boolean;
  featureContestAnalysis?: boolean;
  featureExplainCode?: boolean;
  featureRecommend?: boolean;
  featureSummarizeArticle?: boolean;
}): Promise<ApiResponse<AiConfig>> => {
  return request.put("/admin/ai-config", config);
};
