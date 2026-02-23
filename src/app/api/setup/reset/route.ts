import { NextRequest, NextResponse } from "next/server";
import { unlinkSync } from "fs";
import { join } from "path";
import mysql from "mysql2/promise";

export async function POST(request: NextRequest) {
  // Require a confirmation token in the request body to prevent accidental resets
  const body = await request.json().catch(() => ({}));
  if (body.confirm !== "RESET_SETUP") {
    return NextResponse.json(
      { error: "Missing confirmation. Send { confirm: 'RESET_SETUP' }" },
      { status: 400 }
    );
  }

  const errors: string[] = [];

  // 1. Clear setup_complete from DB (if DB env vars are available)
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
    try {
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "3306"),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME,
      });
      await conn.execute(
        "DELETE FROM system_config WHERE `key` = 'setup_complete'"
      );
      await conn.end();
    } catch (err) {
      errors.push(
        `DB reset failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // 2. Delete .env.local if it exists
  try {
    const envPath = join(process.cwd(), ".env.local");
    unlinkSync(envPath);
  } catch {
    // File doesn't exist or can't be deleted — that's fine
  }

  // 3. Clear the __setup_complete cookie
  const response = NextResponse.json({
    success: true,
    errors: errors.length > 0 ? errors : undefined,
    message:
      "Setup state cleared. If SETUP_COMPLETE is set as an environment variable (e.g. on Railway), remove it from your deployment dashboard and redeploy.",
  });

  response.cookies.set("__setup_complete", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Expire immediately
  });

  return response;
}
