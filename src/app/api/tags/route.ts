import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET — все теги пользователя
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userTags = await db.select().from(tags).where(eq(tags.userId, session.user.id));
  return NextResponse.json({ tags: userTags });
}

// POST — создать тег
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  try {
    const [tag] = await db.insert(tags).values({
      userId: session.user.id,
      name: name.trim(),
      color: color ?? "#6366f1",
    }).returning();
    return NextResponse.json({ tag });
  } catch {
    return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
  }
}