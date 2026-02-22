import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  // Prevent re-running setup — check env var first, then DB if DB env vars are available
  if (process.env.SETUP_COMPLETE === "true") {
    return NextResponse.json({ error: "Setup already completed" }, { status: 400 });
  }

  // If DB env vars are set (e.g. on Railway), check the DB for setup_complete
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
    try {
      const checkConn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "3306"),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME,
      });
      const [rows] = await checkConn.query(
        "SELECT value FROM system_config WHERE `key` = 'setup_complete' LIMIT 1"
      ) as [Array<{value: string}>, unknown];
      await checkConn.end();
      if (rows.length > 0 && rows[0].value === "true") {
        return NextResponse.json({ error: "Setup already completed" }, { status: 400 });
      }
    } catch {
      // DB not yet set up or table doesn't exist — proceed with setup
    }
  }

  const body = await request.json();
  const {
    adminUsername,
    adminPassword,
    dbHost,
    dbPort,
    dbUser,
    dbPassword,
    dbName,
    openaiApiKey,
    appUrl,
  } = body;

  // Validate required fields
  if (!adminUsername || !adminPassword || !dbHost || !dbUser || !dbName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // Test DB connection
    const connection = await mysql.createConnection({
      host: dbHost,
      port: parseInt(dbPort || "3306"),
      user: dbUser,
      password: dbPassword || "",
    });

    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

    // Create tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        id INT PRIMARY KEY AUTO_INCREMENT,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interviews (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        token VARCHAR(128) NOT NULL UNIQUE,
        interview_prompt TEXT,
        aggregation_prompt TEXT,
        welcome_message TEXT,
        token_limit INT NOT NULL DEFAULT 5000,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        ai_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
        ai_model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        interview_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        interview_id INT NOT NULL,
        session_token VARCHAR(128) NOT NULL UNIQUE,
        tokens_used INT NOT NULL DEFAULT 0,
        is_completed BOOLEAN NOT NULL DEFAULT FALSE,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id INT NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        tokens_used INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS aggregation_results (
        id INT PRIMARY KEY AUTO_INCREMENT,
        interview_id INT NOT NULL,
        result TEXT NOT NULL,
        session_count INT NOT NULL DEFAULT 0,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
      )
    `);

    // Create admin user (upsert to handle re-runs gracefully)
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await connection.execute(
      "INSERT INTO admin_users (username, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
      [adminUsername, passwordHash]
    );

    // Store setup_complete in system_config table
    await connection.execute(
      "INSERT INTO system_config (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?",
      ["setup_complete", "true", "true"]
    );

    await connection.end();

    // Write .env.local file (works for local dev; Railway uses dashboard env vars)
    const secret = nanoid(64);
    const envContent = [
      `# Database`,
      `DB_HOST=${dbHost}`,
      `DB_PORT=${dbPort || "3306"}`,
      `DB_USER=${dbUser}`,
      `DB_PASSWORD=${dbPassword || ""}`,
      `DB_NAME=${dbName}`,
      ``,
      `# Auth`,
      `NEXTAUTH_SECRET=${secret}`,
      `NEXTAUTH_URL=${appUrl || "http://localhost:3000"}`,
      ``,
      `# OpenAI`,
      `OPENAI_API_KEY=${openaiApiKey || ""}`,
      ``,
      `# Setup`,
      `SETUP_COMPLETE=true`,
      ``,
    ].join("\n");

    try {
      const envPath = join(process.cwd(), ".env.local");
      writeFileSync(envPath, envContent, "utf-8");
    } catch {
      // On Railway/read-only filesystems, .env.local write may fail — that's OK
      // Setup state is stored in the database
    }

    // Set a cookie so the middleware knows setup is complete
    // (needed on Railway where .env.local is not read and process restart is required)
    const response = NextResponse.json({ success: true });
    response.cookies.set("__setup_complete", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return response;
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}
