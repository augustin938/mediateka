import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string
) {
  try {
    await db.insert(notifications).values({ userId, type, title, body, link: link ?? null });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}