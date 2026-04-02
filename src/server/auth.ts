import jwt from "jsonwebtoken";
import { appConfig } from "@/server/config";

export interface JwtClaims {
  user_id: number;
  username: string;
  role: number;
  exp?: number;
  iat?: number;
  iss?: string;
}

export function signToken(payload: Omit<JwtClaims, "exp" | "iat" | "iss">) {
  return jwt.sign(payload, appConfig.jwtSecret, {
    expiresIn: `${appConfig.jwtExpireHours}h`,
    issuer: "ojv3",
  });
}

export function parseAuthorizationHeader(header: string | null) {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export function verifyToken(token: string): JwtClaims | null {
  try {
    return jwt.verify(token, appConfig.jwtSecret) as JwtClaims;
  } catch {
    return null;
  }
}
