import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Обрабатывает GET-запрос текущего API-маршрута.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userTags = await db.select().from(tags).where(eq(tags.userId, session.user.id));
  return NextResponse.json({ tags: userTags });
}


const TagCreateSchema = z.object({
  name:  z.string().min(1).max(30).trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

// Обрабатывает POST-запрос текущего API-маршрута.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = TagCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, color } = parsed.data;

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