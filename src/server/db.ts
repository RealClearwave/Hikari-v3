import mysql from "mysql2/promise";
import { appConfig } from "@/server/config";

export const db = mysql.createPool({
  host: appConfig.dbHost,
  port: appConfig.dbPort,
  user: appConfig.dbUser,
  password: appConfig.dbPassword,
  database: appConfig.dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
});
