import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems, activityLogs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { formatLocalMonthKey, formatRuMonthLabel } from "@/lib/date";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.user.id;

  // Загружаем коллекцию пользователя вместе с карточками медиа.
  const items = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(eq(collectionItems.userId, uid));

  // Загружаем журнал действий пользователя.
  const activity = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, uid))
    .orderBy(desc(activityLogs.createdAt));

  // Базовые агрегаты по статусам и типам.
  const total = items.length;
  const byStatus = {
    WANT: items.filter((i) => i.collection_item.status === "WANT").length,
    IN_PROGRESS: items.filter((i) => i.collection_item.status === "IN_PROGRESS").length,
    COMPLETED: items.filter((i) => i.collection_item.status === "COMPLETED").length,
    DROPPED: items.filter((i) => i.collection_item.status === "DROPPED").length,
  };
  const byType = {
    movie: items.filter((i) => i.media_item.type === "movie").length,
    book: items.filter((i) => i.media_item.type === "book").length,
    game: items.filter((i) => i.media_item.type === "game").length,
  };

  // Статистика оценок.
  const rated = items.filter((i) => i.collection_item.rating !== null);
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, i) => sum + (i.collection_item.rating ?? 0), 0) / rated.length).toFixed(1)
    : null;

  // Распределение оценок от 1 до 10.
  const ratingDist = Array.from({ length: 10 }, (_, i) => ({
    rating: i + 1,
    count: rated.filter((r) => r.collection_item.rating === i + 1).length,
  }));

  // Самые частые жанры в коллекции.
  const genreMap: Record<string, number> = {};
  items.forEach((i) => {
    (i.media_item.genres ?? []).forEach((g) => {
      genreMap[g] = (genreMap[g] ?? 0) + 1;
    });
  });
  const topGenres = Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Активность по месяцам за последний год.
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      key: formatLocalMonthKey(d),
      label: formatRuMonthLabel(d),
      added: 0,
      completed: 0,
    };
  });

  activity.forEach((a) => {
    const d = new Date(a.createdAt);
    const key = formatLocalMonthKey(d);
    const m = months.find((m) => m.key === key);
    if (!m) return;
    if (a.action === "added") m.added++;
    if (a.action === "completed") m.completed++;
  });

  // Сколько завершено по каждому типу.
  const completedByType = {
    movie: items.filter((i) => i.collection_item.status === "COMPLETED" && i.media_item.type === "movie").length,
    book: items.filter((i) => i.collection_item.status === "COMPLETED" && i.media_item.type === "book").length,
    game: items.filter((i) => i.collection_item.status === "COMPLETED" && i.media_item.type === "game").length,
  };

  // Последние завершенные элементы.
  const recentCompleted = items
    .filter((i) => i.collection_item.status === "COMPLETED" && i.collection_item.completedAt)
    .sort((a, b) => new Date(b.collection_item.completedAt!).getTime() - new Date(a.collection_item.completedAt!).getTime())
    .slice(0, 5)
    .map((i) => ({
      title: i.media_item.title,
      type: i.media_item.type,
      posterUrl: i.media_item.posterUrl,
      rating: i.collection_item.rating,
      completedAt: i.collection_item.completedAt,
    }));

  return NextResponse.json({
    total,
    byStatus,
    byType,
    avgRating,
    ratingDist,
    topGenres,
    activityByMonth: months,
    completedByType,
    recentCompleted,
    totalRated: rated.length,
    totalCompleted: byStatus.COMPLETED,
  });
}