import { parseAuthorizationHeader, verifyToken } from "@/server/auth";
import { fail } from "@/server/response";
import { getLlmConfig } from "./config";
import type { JwtClaims } from "@/server/auth";

export type FeatureName =
  | "analyzeError"
  | "generateSolution"
  | "generateProblem"
  | "contestAnalysis"
  | "explainCode"
  | "recommend"
  | "summarizeArticle";

export async function verifyAuthAndFeature(
  request: Request,
  feature: FeatureName
): Promise<{ claims: JwtClaims } | Response> {
  // Verify auth
  const token = parseAuthorizationHeader(request.headers.get("Authorization"));
  if (!token) {
    return fail("Authentication required", 401);
  }
  const claims = verifyToken(token);
  if (!claims) {
    return fail("Invalid or expired token", 401);
  }

  // Check if LLM feature is enabled
  const config = await getLlmConfig();
  if (!config.features[feature]) {
    return fail("This AI feature is currently disabled", 403);
  }
  if (!config.apiKey) {
    return fail("LLM API key not configured by administrator", 503);
  }

  return { claims };
}

export function verifyAdmin(
  request: Request
): Promise<{ claims: JwtClaims } | Response> {
  const token = parseAuthorizationHeader(request.headers.get("Authorization"));
  if (!token) {
    return Promise.resolve(fail("Authentication required", 401));
  }
  const claims = verifyToken(token);
  if (!claims) {
    return Promise.resolve(fail("Invalid or expired token", 401));
  }
  if (claims.role !== 1) {
    return Promise.resolve(fail("Admin access required", 403));
  }
  return Promise.resolve({ claims });
}
