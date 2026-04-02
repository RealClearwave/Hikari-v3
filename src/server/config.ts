export const appConfig = {
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_key",
  jwtExpireHours: Number(process.env.JWT_EXPIRE_HOURS || 24),
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "",
  dbName: process.env.DB_NAME || "ojv3",
};
