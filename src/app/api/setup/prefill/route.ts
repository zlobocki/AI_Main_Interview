import { NextResponse } from "next/server";

/**
 * GET /api/setup/prefill
 *
 * Returns current DB environment variable values so the setup wizard
 * can pre-fill the database configuration fields. This prevents the
 * common mistake of entering different DB settings than what's already
 * configured (e.g. on Railway where DB env vars are set in the dashboard).
 *
 * Passwords are masked for security.
 */
export async function GET() {
  return NextResponse.json({
    dbHost: process.env.DB_HOST || "",
    dbPort: process.env.DB_PORT || "3306",
    dbUser: process.env.DB_USER || "",
    dbPassword: process.env.DB_PASSWORD ? "••••••••" : "",
    dbPasswordSet: !!process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME || "interview_app",
    appUrl: process.env.NEXTAUTH_URL || process.env.AUTH_URL || "",
  });
}
