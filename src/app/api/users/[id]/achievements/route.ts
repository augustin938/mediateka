import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { activityLogs, collectionItems, friendships, mediaItems } from "@/lib/db/schema";
import { and, eq, or } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Разрешаем смотреть достижения только себе или подтверждённым друзьям.
  if (id !== session.user.id) {
    const [friendship] = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, session.user.id), eq(friendships.addresseeId, id)),
        and(eq(friendships.requesterId, id), eq(friendships.addresseeId, session.user.id))
      )
    );
    if (!friendship || friendship.status !== "accepted") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const items = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(eq(collectionItems.userId, id));

  const logs = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, id));

  const stats = {
    total: items.length,
    movies: items.filter((i) => i.media_item.type === "movie").length,
    books: items.filter((i) => i.media_item.type === "book").length,
    games: items.filter((i) => i.media_item.type === "game").length,
    completed: items.filter((i) => i.collection_item.status === "COMPLETED").length,
    dropped: items.filter((i) => i.collection_item.status === "DROPPED").length,
    rated: items.filter((i) => i.collection_item.rating !== null).length,
    reviewed: items.filter((i) => i.collection_item.review !== null && i.collection_item.review.length > 0).length,
    avgRating: (() => {
      const rated = items.filter((i) => i.collection_item.rating !== null);
      if (!rated.length) return 0;
      return rated.reduce((sum, i) => sum + (i.collection_item.rating ?? 0), 0) / rated.length;
    })(),
    hasAllTypes:
      items.some((i) => i.media_item.type === "movie") &&
      items.some((i) => i.media_item.type === "book") &&
      items.some((i) => i.media_item.type === "game"),
    logCount: logs.length,
  };

  return NextResponse.json({ stats });
}

