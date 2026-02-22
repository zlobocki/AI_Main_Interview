import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

/**
 * POST /api/admin/reset-password
 *
 * Emergency password reset endpoint. Requires DB credentials to authenticate
 * the request (so only someone with DB access can reset the admin password).
 *
 * Body: { dbHost, dbPort, dbUser, dbPassword, dbName, username, newPassword }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { dbHost, dbPort, dbUser, dbPassword, dbName, username, newPassword } = body;

  if (!dbHost || !dbUser || !dbName || !username || !newPassword) {
    return NextResponse.json(
      { error: "Missing required fields: dbHost, dbUser, dbName, username, newPassword" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      port: parseInt(dbPort || "3306"),
      user: dbUser,
      password: dbPassword || "",
      database: dbName,
    });

    // Check if user exists
    const [rows] = await connection.execute(
      "SELECT id, username FROM admin_users WHERE username = ? LIMIT 1",
      [username]
    ) as [Array<{ id: number; username: string }>, unknown];

    if (rows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: `User '${username}' not found in admin_users table` },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await connection.execute(
      "UPDATE admin_users SET password_hash = ? WHERE username = ?",
      [passwordHash, username]
    );

    await connection.end();

    return NextResponse.json({
      success: true,
      message: `Password for '${username}' has been reset successfully. You can now log in with the new password.`,
    });
  } catch (error) {
    console.error("[reset-password] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reset failed" },
      { status: 500 }
    );
  }
}
