import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems, activityLogs } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { addToCollectionSchema } from "@/lib/validations/collection";
import type { CollectionItemWithMedia } from "@/types";

async function logActivity(userId: string, action: string, media: {
  id: string; type: string; title: string; posterUrl?: string | null;
}, details?: string) {
  try {
    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      userId,
      action,
      mediaTitle: media.title,
      mediaType: media.type as any,
      mediaId: media.id,
      posterUrl: media.posterUrl ?? null,
      details: details ?? null,
    });
  } catch (e) {
    console.error("Activity log error:", e);
  }
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const conditions = [eq(collectionItems.userId, session.user.id)];
  if (status && ["WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"].includes(status)) {
    conditions.push(eq(collectionItems.status, status as any));
  }

  const items = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(and(...conditions))
    .orderBy(desc(collectionItems.addedAt));

  const result: CollectionItemWithMedia[] = items.map(({ collection_item, media_item }) => ({
    ...collection_item,
    mediaItem: media_item,
  }));

  return NextResponse.json({ items: result });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = addToCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mediaItemId, status, externalId, type, title, originalTitle, description,
    posterUrl, year, genres, externalRating, externalUrl, director, author, developer } = parsed.data;

  await db.insert(mediaItems).values({
    id: mediaItemId, externalId, type, title,
    originalTitle: originalTitle ?? null, description: description ?? null,
    posterUrl: posterUrl ?? null, year: year ?? null, genres: genres ?? [],
    externalRating: externalRating ?? null, externalUrl: externalUrl ?? null,
    director: director ?? null, author: author ?? null, developer: developer ?? null,
  }).onConflictDoUpdate({
    target: mediaItems.id,
    set: { title, posterUrl: posterUrl ?? null, updatedAt: new Date() },
  });

  const [newItem] = await db
    .insert(collectionItems)
    .values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      mediaItemId,
      status,
    })
    .onConflictDoNothing()
    .returning();
  if (!newItem) {
    const [existing] = await db
      .select()
      .from(collectionItems)
      .where(and(eq(collectionItems.userId, session.user.id), eq(collectionItems.mediaItemId, mediaItemId)));
    return NextResponse.json({ error: "Already in collection", item: existing ?? null }, { status: 409 });
  }

  // Сохраняем событие в ленту активности сразу после успешного добавления.
  const actionMap: Record<string, string> = {
    WANT: "want", IN_PROGRESS: "started", COMPLETED: "completed", DROPPED: "dropped",
  };
  await logActivity(session.user.id, actionMap[status] ?? "added",
    { id: mediaItemId, type, title, posterUrl });

  return NextResponse.json({ item: newItem }, { status: 201 });
}