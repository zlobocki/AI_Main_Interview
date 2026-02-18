import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";

// GET /api/interviews/[id]/results - get sessions and latest aggregation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  try {
    // Get all sessions for this interview
    const sessions = await db
      .select()
      .from(schema.interviewSessions)
      .where(eq(schema.interviewSessions.interviewId, parseInt(id)))
      .orderBy(desc(schema.interviewSessions.startedAt));

    // Get latest aggregation result
    const aggregations = await db
      .select()
      .from(schema.aggregationResults)
      .where(eq(schema.aggregationResults.interviewId, parseInt(id)))
      .orderBy(desc(schema.aggregationResults.generatedAt))
      .limit(1);

    return NextResponse.json({
      sessions,
      latestAggregation: aggregations[0] || null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}

// POST /api/interviews/[id]/results - generate aggregation
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  try {
    // Get interview
    const interviews = await db
      .select()
      .from(schema.interviews)
      .where(eq(schema.interviews.id, parseInt(id)))
      .limit(1);

    if (interviews.length === 0) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const interview = interviews[0];

    // Get all completed sessions with their messages
    const sessions = await db
      .select()
      .from(schema.interviewSessions)
      .where(eq(schema.interviewSessions.interviewId, parseInt(id)));

    if (sessions.length === 0) {
      return NextResponse.json(
        { error: "No interview sessions found" },
        { status: 400 }
      );
    }

    // Build transcript for each session
    const transcripts: string[] = [];
    for (const s of sessions) {
      const messages = await db
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.sessionId, s.id))
        .orderBy(schema.chatMessages.createdAt);

      const userMessages = messages.filter((m) => m.role !== "system");
      if (userMessages.length === 0) continue;

      const transcript = userMessages
        .map((m) => `${m.role === "user" ? "Participant" : "Interviewer"}: ${m.content}`)
        .join("\n");

      transcripts.push(
        `--- Session ${s.id} (${new Date(s.startedAt).toLocaleDateString()}) ---\n${transcript}`
      );
    }

    if (transcripts.length === 0) {
      return NextResponse.json(
        { error: "No conversation data found" },
        { status: 400 }
      );
    }

    const aggregationPrompt =
      interview.aggregationPrompt ||
      "Analyze the following interview transcripts and provide a comprehensive summary of key themes, common responses, notable insights, and any patterns you observe across participants. Structure your analysis clearly.";

    const fullTranscript = transcripts.join("\n\n");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: interview.aiModel || "gpt-4o",
      messages: [
        {
          role: "system",
          content: aggregationPrompt,
        },
        {
          role: "user",
          content: `Here are the interview transcripts:\n\n${fullTranscript}`,
        },
      ],
      max_tokens: 2000,
    });

    const result = completion.choices[0]?.message?.content || "";

    // Save aggregation result
    await db.insert(schema.aggregationResults).values({
      interviewId: parseInt(id),
      result,
      sessionCount: sessions.length,
    });

    return NextResponse.json({ result, sessionCount: sessions.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate aggregation" },
      { status: 500 }
    );
  }
}
