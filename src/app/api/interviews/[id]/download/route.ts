import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

// GET /api/interviews/[id]/download - download all conversation data as CSV
export async function GET(
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

    // Get all sessions
    const sessions = await db
      .select()
      .from(schema.interviewSessions)
      .where(eq(schema.interviewSessions.interviewId, parseInt(id)))
      .orderBy(desc(schema.interviewSessions.startedAt));

    // Build CSV
    const rows: string[] = [
      "session_id,session_token,started_at,completed_at,is_completed,tokens_used,role,message,message_time",
    ];

    for (const s of sessions) {
      const messages = await db
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.sessionId, s.id))
        .orderBy(schema.chatMessages.createdAt);

      const userMessages = messages.filter((m) => m.role !== "system");

      if (userMessages.length === 0) {
        rows.push(
          [
            s.id,
            s.sessionToken,
            new Date(s.startedAt).toISOString(),
            s.completedAt ? new Date(s.completedAt).toISOString() : "",
            s.isCompleted,
            s.tokensUsed,
            "",
            "",
            "",
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        );
      } else {
        for (const m of userMessages) {
          rows.push(
            [
              s.id,
              s.sessionToken,
              new Date(s.startedAt).toISOString(),
              s.completedAt ? new Date(s.completedAt).toISOString() : "",
              s.isCompleted,
              s.tokensUsed,
              m.role,
              m.content,
              new Date(m.createdAt).toISOString(),
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(",")
          );
        }
      }
    }

    const csv = rows.join("\n");
    const filename = `${interview.name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate download" }, { status: 500 });
  }
}
