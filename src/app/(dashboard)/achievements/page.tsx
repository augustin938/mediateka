import AchievementsClient from "@/components/achievements/AchievementsClient";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems, activityLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function AchievementsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const items = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(eq(collectionItems.userId, session.user.id));

  const logs = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, session.user.id));

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
    hasAllTypes: items.some((i) => i.media_item.type === "movie") &&
      items.some((i) => i.media_item.type === "book") &&
      items.some((i) => i.media_item.type === "game"),
    logCount: logs.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Достижения</h1>
        <p className="text-muted-foreground mt-1">Награды за активность в коллекции</p>
      </div>
      <AchievementsClient stats={stats} />
    </div>
  );
}