import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  // Prevent re-running setup
  if (process.env.SETUP_COMPLETE === "true") {
    return NextResponse.json({ error: "Setup already completed" }, { status: 400 });
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
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.execute(`USE \`${dbName}\``);

    // Create tables
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_config (
        id INT PRIMARY KEY AUTO_INCREMENT,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await connection.execute(`
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

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS interview_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        interview_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
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

    await connection.execute(`
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

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS aggregation_results (
        id INT PRIMARY KEY AUTO_INCREMENT,
        interview_id INT NOT NULL,
        result TEXT NOT NULL,
        session_count INT NOT NULL DEFAULT 0,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
      )
    `);

    // Create admin user
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await connection.execute(
      "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
      [adminUsername, passwordHash]
    );

    await connection.end();

    // Write .env.local file
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

    const envPath = join(process.cwd(), ".env.local");
    writeFileSync(envPath, envContent, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}
