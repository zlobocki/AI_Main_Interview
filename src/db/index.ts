import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

type DbType = MySql2Database<typeof schema>;

let db: DbType | null = null;

export function getDb(): DbType {
  if (!db) {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "interview_app",
      waitForConnections: true,
      connectionLimit: 10,
    });
    db = drizzle(pool, { schema, mode: "default" }) as DbType;
  }
  return db;
}

export { schema };
