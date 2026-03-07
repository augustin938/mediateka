import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems, activityLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateCollectionItemSchema as updateCollectionSchema } from "@/lib/validations/collection";

async function logActivity(userId: string, action: string, media: {
  id: string; type: string; title: string; posterUrl?: string | null;
}, details?: string) {
  try {
    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      userId, action,
      mediaTitle: media.title,
      mediaType: media.type as any,
      mediaId: media.id,
      posterUrl: media.posterUrl ?? null,
      details: details ?? null,
    });
  } catch (e) { console.error("Activity log error:", e); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateCollectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [existing] = await db.select().from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(and(eq(collectionItems.id, id), eq(collectionItems.userId, session.user.id)));

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { status, rating, review } = parsed.data;
  const updateData: any = { updatedAt: new Date() };

  if (status) {
    updateData.status = status;
    if (status === "IN_PROGRESS") updateData.startedAt = new Date();
    if (status === "COMPLETED") updateData.completedAt = new Date();
  }
  if (rating !== undefined) updateData.rating = rating;
  if (review !== undefined) updateData.review = review;

  const [updated] = await db.update(collectionItems)
    .set(updateData)
    .where(eq(collectionItems.id, id))
    .returning();

  const media = {
    id: existing.media_item.id,
    type: existing.media_item.type,
    title: existing.media_item.title,
    posterUrl: existing.media_item.posterUrl,
  };

  // Log what changed
  if (status) {
    const actionMap: Record<string, string> = {
      WANT: "want", IN_PROGRESS: "started", COMPLETED: "completed", DROPPED: "dropped",
    };
    await logActivity(session.user.id, actionMap[status] ?? "added", media);
  }
  if (rating !== undefined && rating !== null) {
    await logActivity(session.user.id, "rated", media, `оценка ${rating}/10`);
  }
  if (review !== undefined && review !== null && review.length > 0) {
    await logActivity(session.user.id, "reviewed", media);
  }

  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [existing] = await db.select().from(collectionItems)
    .where(and(eq(collectionItems.id, id), eq(collectionItems.userId, session.user.id)));

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(collectionItems).where(eq(collectionItems.id, id));

  return NextResponse.json({ success: true });
}