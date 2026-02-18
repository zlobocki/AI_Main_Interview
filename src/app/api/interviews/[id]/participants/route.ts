import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

// GET /api/interviews/[id]/participants
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  try {
    const rows = await db
      .select()
      .from(schema.interviewParticipants)
      .where(eq(schema.interviewParticipants.interviewId, parseInt(id)));

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }
}

// POST /api/interviews/[id]/participants - add participant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { email } = await request.json();

  if (!email || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const db = getDb();

  try {
    await db.insert(schema.interviewParticipants).values({
      interviewId: parseInt(id),
      email: email.trim().toLowerCase(),
    });

    const rows = await db
      .select()
      .from(schema.interviewParticipants)
      .where(eq(schema.interviewParticipants.interviewId, parseInt(id)));

    return NextResponse.json(rows, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to add participant" }, { status: 500 });
  }
}
