import path from "path";

export const appConfig = {
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_key",
  jwtExpireHours: Number(process.env.JWT_EXPIRE_HOURS || 24),
  dbPath: process.env.DB_PATH || path.join(process.cwd(), "data", "ojv3.db"),
};
