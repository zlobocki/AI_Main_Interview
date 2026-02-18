import {
  mysqlTable,
  varchar,
  text,
  int,
  boolean,
  timestamp,
  json,
} from "drizzle-orm/mysql-core";

// System configuration (admin credentials, AI settings, etc.)
export const systemConfig = mysqlTable("system_config", {
  id: int("id").primaryKey().autoincrement(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Admin users
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Interviews
export const interviews = mysqlTable("interviews", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  token: varchar("token", { length: 128 }).notNull().unique(), // unique URL token
  interviewPrompt: text("interview_prompt"), // AI interviewer instructions
  aggregationPrompt: text("aggregation_prompt"), // AI aggregation instructions
  welcomeMessage: text("welcome_message"), // welcome message for participants
  tokenLimit: int("token_limit").notNull().default(5000), // per-session token limit
  isActive: boolean("is_active").notNull().default(false), // whether link is active
  aiProvider: varchar("ai_provider", { length: 50 }).notNull().default("openai"),
  aiModel: varchar("ai_model", { length: 100 }).notNull().default("gpt-4o"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Interview participants (email list)
export const interviewParticipants = mysqlTable("interview_participants", {
  id: int("id").primaryKey().autoincrement(),
  interviewId: int("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Interview sessions (individual conversations)
export const interviewSessions = mysqlTable("interview_sessions", {
  id: int("id").primaryKey().autoincrement(),
  interviewId: int("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 128 }).notNull().unique(),
  tokensUsed: int("tokens_used").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Chat messages within sessions
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").primaryKey().autoincrement(),
  sessionId: int("session_id").notNull().references(() => interviewSessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  tokensUsed: int("tokens_used").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cached aggregation results
export const aggregationResults = mysqlTable("aggregation_results", {
  id: int("id").primaryKey().autoincrement(),
  interviewId: int("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  result: text("result").notNull(),
  sessionCount: int("session_count").notNull().default(0),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});
