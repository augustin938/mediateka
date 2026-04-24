import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";

// Создаёт уведомление с антидублем: одинаковые события в коротком окне не дублируются.
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
  dedupeWindowMs = 10_000
) {
  try {
    // Ищем недавно созданное идентичное уведомление.
    const threshold = new Date(Date.now() - dedupeWindowMs);
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, type),
          eq(notifications.title, title),
          eq(notifications.body, body),
          link ? eq(notifications.link, link) : isNull(notifications.link),
          gt(notifications.createdAt, threshold)
        )
      )
      .limit(1);
    if (existing) return;

    // Если дубля нет — создаём новое уведомление.
    await db.insert(notifications).values({ userId, type, title, body, link: link ?? null });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}