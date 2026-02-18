import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { nanoid } from "nanoid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getDb();

  try {
    // Find the interview
    const interviews = await db
      .select()
      .from(schema.interviews)
      .where(eq(schema.interviews.token, token))
      .limit(1);

    if (interviews.length === 0) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const interview = interviews[0];

    if (!interview.isActive) {
      return NextResponse.json(
        { error: "This interview is not currently active" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessionToken, message } = body;

    // Get or create session
    let session;
    if (sessionToken) {
      const sessions = await db
        .select()
        .from(schema.interviewSessions)
        .where(eq(schema.interviewSessions.sessionToken, sessionToken))
        .limit(1);
      session = sessions[0] || null;
    }

    if (!session) {
      // Create new session
      const newToken = nanoid(48);
      await db.insert(schema.interviewSessions).values({
        interviewId: interview.id,
        sessionToken: newToken,
      });
      const sessions = await db
        .select()
        .from(schema.interviewSessions)
        .where(eq(schema.interviewSessions.sessionToken, newToken))
        .limit(1);
      session = sessions[0];
    }

    // Check if session is completed
    if (session.isCompleted) {
      return NextResponse.json(
        { error: "This interview session has ended" },
        { status: 403 }
      );
    }

    // Check token limit
    if (session.tokensUsed >= interview.tokenLimit) {
      await db
        .update(schema.interviewSessions)
        .set({ isCompleted: true, completedAt: new Date() })
        .where(eq(schema.interviewSessions.id, session.id));

      return NextResponse.json({
        sessionToken: session.sessionToken,
        reply:
          "Thank you for your time. This interview session has reached its limit and is now complete.",
        isCompleted: true,
      });
    }

    // Get conversation history
    const history = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, session.id))
      .orderBy(schema.chatMessages.createdAt);

    // Build messages for OpenAI
    const systemPrompt =
      interview.interviewPrompt ||
      "You are a professional interviewer. Conduct a structured interview with the participant. Ask questions one at a time, listen carefully to responses, and follow up appropriately. Be professional, friendly, and thorough.";

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Add new user message if provided
    if (message) {
      messages.push({ role: "user", content: message });

      // Save user message
      await db.insert(schema.chatMessages).values({
        sessionId: session.id,
        role: "user",
        content: message,
      });
    }

    // Call OpenAI
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
      messages,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content || "";
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Save assistant message
    await db.insert(schema.chatMessages).values({
      sessionId: session.id,
      role: "assistant",
      content: reply,
      tokensUsed,
    });

    // Update session token count
    const newTotal = session.tokensUsed + tokensUsed;
    const isCompleted = newTotal >= interview.tokenLimit;

    await db
      .update(schema.interviewSessions)
      .set({
        tokensUsed: newTotal,
        isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
      })
      .where(eq(schema.interviewSessions.id, session.id));

    return NextResponse.json({
      sessionToken: session.sessionToken,
      reply,
      tokensUsed: newTotal,
      tokenLimit: interview.tokenLimit,
      isCompleted,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

// GET - retrieve session history (for resuming)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const sessionToken = request.nextUrl.searchParams.get("session");

  if (!sessionToken) {
    return NextResponse.json({ error: "Session token required" }, { status: 400 });
  }

  const db = getDb();

  try {
    // Verify interview exists and is active
    const interviews = await db
      .select()
      .from(schema.interviews)
      .where(eq(schema.interviews.token, token))
      .limit(1);

    if (interviews.length === 0) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const sessions = await db
      .select()
      .from(schema.interviewSessions)
      .where(eq(schema.interviewSessions.sessionToken, sessionToken))
      .limit(1);

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = sessions[0];
    const messages = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, session.id))
      .orderBy(schema.chatMessages.createdAt);

    return NextResponse.json({
      session,
      messages: messages.filter((m) => m.role !== "system"),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}
