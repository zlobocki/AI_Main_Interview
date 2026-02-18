import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

// PATCH /api/interviews/[id]/participants/[pid] - update email
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pid } = await params;
  const { email } = await request.json();

  if (!email || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const db = getDb();

  try {
    await db
      .update(schema.interviewParticipants)
      .set({ email: email.trim().toLowerCase() })
      .where(eq(schema.interviewParticipants.id, parseInt(pid)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update participant" }, { status: 500 });
  }
}

// DELETE /api/interviews/[id]/participants/[pid]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pid } = await params;
  const db = getDb();

  try {
    await db
      .delete(schema.interviewParticipants)
      .where(eq(schema.interviewParticipants.id, parseInt(pid)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete participant" }, { status: 500 });
  }
}
