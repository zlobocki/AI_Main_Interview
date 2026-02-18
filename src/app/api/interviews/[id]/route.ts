import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, and, ne } from "drizzle-orm";

// GET /api/interviews/[id]
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
      .from(schema.interviews)
      .where(eq(schema.interviews.id, parseInt(id)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch interview" }, { status: 500 });
  }
}

// PATCH /api/interviews/[id] - update interview fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const body = await request.json();

  try {
    // If name is being changed, check uniqueness
    if (body.name !== undefined) {
      const existing = await db
        .select()
        .from(schema.interviews)
        .where(
          and(
            eq(schema.interviews.name, body.name.trim()),
            ne(schema.interviews.id, parseInt(id))
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "An interview with this name already exists" },
          { status: 409 }
        );
      }
      body.name = body.name.trim();
    }

    await db
      .update(schema.interviews)
      .set(body)
      .where(eq(schema.interviews.id, parseInt(id)));

    const updated = await db
      .select()
      .from(schema.interviews)
      .where(eq(schema.interviews.id, parseInt(id)))
      .limit(1);

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update interview" }, { status: 500 });
  }
}

// DELETE /api/interviews/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  try {
    await db
      .delete(schema.interviews)
      .where(eq(schema.interviews.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete interview" }, { status: 500 });
  }
}
