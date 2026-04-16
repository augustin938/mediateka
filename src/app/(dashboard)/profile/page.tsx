import ProfileClient from "@/components/profile/ProfileClient";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems, activityLogs, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { formatLocalDateKey } from "@/lib/date";
import { getQuizResultsByUser } from "@/lib/quiz-results";

import type { Metadata } from "next";
import type { QuizResult } from "@/types";

export const metadata: Metadata = {
  title: "Профиль",
  description: "Настройки аккаунта и статистика",
};

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const [items, activity, userRow, quizRows] = await Promise.all([
    db.select().from(collectionItems)
      .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
      .where(eq(collectionItems.userId, session.user.id)),
    db.select({ createdAt: activityLogs.createdAt })
      .from(activityLogs)
      .where(eq(activityLogs.userId, session.user.id)),
    db.select().from(users).where(eq(users.id, session.user.id)).limit(1),
    getQuizResultsByUser(session.user.id, 20),
  ]);

  const stats = {
    total: items.length,
    completed: items.filter((i) => i.collection_item.status === "COMPLETED").length,
    inProgress: items.filter((i) => i.collection_item.status === "IN_PROGRESS").length,
    want: items.filter((i) => i.collection_item.status === "WANT").length,
    movies: items.filter((i) => i.media_item.type === "movie").length,
    books: items.filter((i) => i.media_item.type === "book").length,
    games: items.filter((i) => i.media_item.type === "game").length,
    avgRating: (() => {
      const rated = items.filter((i) => i.collection_item.rating !== null);
      if (!rated.length) return null;
      return (rated.reduce((s, i) => s + (i.collection_item.rating ?? 0), 0) / rated.length).toFixed(1);
    })(),
  };

  const activityByDay: Record<string, number> = {};
  for (const a of activity) {
    const day = formatLocalDateKey(new Date(a.createdAt));
    activityByDay[day] = (activityByDay[day] ?? 0) + 1;
  }

  const collection = items.map(({ collection_item, media_item }) => ({
    collectionItemId: collection_item.id,
    mediaItemId: media_item.id,
    title: media_item.title,
    posterUrl: media_item.posterUrl ?? null,
    type: media_item.type,
    year: media_item.year ?? null,
    rating: collection_item.rating ?? null,
    status: collection_item.status,
  }));

  const pinnedIds: string[] = (userRow[0] as any)?.pinnedItems ?? [];

  const quizHistory: QuizResult[] = quizRows.map((r) => ({
    id:             r.id,
    mode:           r.mode as QuizResult["mode"],
    category:       r.category as QuizResult["category"],
    points:         r.points ?? r.correctAnswers ?? r.score,
    correctAnswers: r.correctAnswers ?? r.score,
    total:          r.total,
    streak:         r.streak,
    createdAt:      r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Профиль</h1>
        <p className="text-muted-foreground mt-1">Настройки аккаунта и статистика</p>
      </div>
      <ProfileClient
        user={{
          id: session.user.id,
          name: session.user.name ?? "",
          email: session.user.email,
          image: (session.user as any).image ?? null,
        }}
        stats={stats}
        activityByDay={activityByDay}
        collection={collection}
        initialPinnedIds={pinnedIds}
        quizHistory={quizHistory}
      />
    </div>
  );
}