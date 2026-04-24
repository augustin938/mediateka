import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatLocalDateKey, formatRuLongDate } from "@/lib/date";

const STATUS_LABELS: Record<string, string> = {
  WANT: "Хочу",
  IN_PROGRESS: "В процессе",
  COMPLETED: "Завершено",
  DROPPED: "Брошено",
};

const TYPE_LABELS: Record<string, string> = {
  movie: "Фильм",
  book: "Книга",
  game: "Игра",
};

// Обрабатывает GET-запрос текущего API-маршрута.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(eq(collectionItems.userId, session.user.id))
    .orderBy(collectionItems.addedAt);

  // Формируем CSV вручную, чтобы безопасно экранировать текстовые поля.
  const header = ["Название", "Тип", "Статус", "Оценка", "Год", "Жанры", "Отзыв", "Добавлено"].join(",");
  const rows = items.map(({ collection_item, media_item }) => {
    const cols = [
      `"${media_item.title.replace(/"/g, '""')}"`,
      TYPE_LABELS[media_item.type] ?? media_item.type,
      STATUS_LABELS[collection_item.status] ?? collection_item.status,
      collection_item.rating ?? "",
      media_item.year ?? "",
      `"${(media_item.genres ?? []).join(", ")}"`,
      `"${(collection_item.review ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      formatRuLongDate(new Date(collection_item.addedAt)),
    ];
    return cols.join(",");
  });

  const csv = "\uFEFF" + [header, ...rows].join("\n"); // BOM for Excel

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mediateka_${formatLocalDateKey(new Date())}.csv"`,
    },
  });
}