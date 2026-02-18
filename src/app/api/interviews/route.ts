import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET /api/interviews - list all interviews
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getDb();
    const rows = await db.select().from(schema.interviews).orderBy(schema.interviews.createdAt);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch interviews" }, { status: 500 });
  }
}

// POST /api/interviews - create new interview
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const db = getDb();

    // Check uniqueness
    const existing = await db
      .select()
      .from(schema.interviews)
      .where(eq(schema.interviews.name, name.trim()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "An interview with this name already exists" }, { status: 409 });
    }

    // Generate a long unique token (48 chars of URL-safe random)
    const token = nanoid(48);

    await db.insert(schema.interviews).values({
      name: name.trim(),
      token,
    });

    const created = await db
      .select()
      .from(schema.interviews)
      .where(eq(schema.interviews.name, name.trim()))
      .limit(1);

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 });
  }
}
