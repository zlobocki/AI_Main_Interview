import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

// GET /api/interviews/[id]/sessions/[sid] - get messages for a session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sid } = await params;
  const db = getDb();

  try {
    const messages = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, parseInt(sid)))
      .orderBy(schema.chatMessages.createdAt);

    // Filter out system messages
    return NextResponse.json(messages.filter((m) => m.role !== "system"));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
