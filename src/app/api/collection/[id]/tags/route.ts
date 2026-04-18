import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, collectionItemTags, tags } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Проверяем, что элемент действительно принадлежит текущему пользователю.
  const [item] = await db.select().from(collectionItems)
    .where(and(eq(collectionItems.id, id), eq(collectionItems.userId, session.user.id)));
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const itemTags = await db.select({ tag: tags })
    .from(collectionItemTags)
    .innerJoin(tags, eq(collectionItemTags.tagId, tags.id))
    .where(eq(collectionItemTags.collectionItemId, id));

  return NextResponse.json({ tags: itemTags.map((t) => t.tag) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { tagId } = await req.json();

  const [item] = await db.select().from(collectionItems)
    .where(and(eq(collectionItems.id, id), eq(collectionItems.userId, session.user.id)));
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await db.insert(collectionItemTags).values({ collectionItemId: id, tagId });
  } catch {
    return NextResponse.json({ error: "Already tagged" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { tagId } = await req.json();

  await db.delete(collectionItemTags)
    .where(and(eq(collectionItemTags.collectionItemId, id), eq(collectionItemTags.tagId, tagId)));
  return NextResponse.json({ ok: true });
}