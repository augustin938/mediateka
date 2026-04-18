import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, session.user.id)));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, color } = await req.json();
  const [tag] = await db.update(tags)
    .set({ ...(name && { name }), ...(color && { color }) })
    .where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))
    .returning();
  return NextResponse.json({ tag });
}