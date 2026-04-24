import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, eq, gt } from "drizzle-orm";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
  dedupeWindowMs = 10_000
) {
  try {
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
          eq(notifications.link, link ?? null),
          gt(notifications.createdAt, threshold)
        )
      )
      .limit(1);
    if (existing) return;

    await db.insert(notifications).values({ userId, type, title, body, link: link ?? null });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}