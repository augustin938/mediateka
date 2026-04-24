import { db } from "@/lib/db";
import { friendships, chatConversations, users } from "@/lib/db/schema";
import { and, or, eq } from "drizzle-orm";

// Публичная функция assertFriends для внешнего использования модуля.
export async function assertFriends(userId: string, otherUserId: string) {
  const [friendship] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(and(
      eq(friendships.status, "accepted"),
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, otherUserId)),
        and(eq(friendships.requesterId, otherUserId), eq(friendships.addresseeId, userId))
      )
    ));
  if (!friendship) throw new Error("NOT_FRIENDS");
}

// Публичная функция normalizePair для внешнего использования модуля.
export function normalizePair(a: string, b: string) {
  return a < b ? [a, b] as const : [b, a] as const;
}

// Публичная функция getOrCreateConversation для внешнего использования модуля.
export async function getOrCreateConversation(userId: string, otherUserId: string) {
  const [a, b] = normalizePair(userId, otherUserId);

  const [existing] = await db
    .select()
    .from(chatConversations)
    .where(and(eq(chatConversations.userAId, a), eq(chatConversations.userBId, b)));

  if (existing) return existing;

  const [created] = await db
    .insert(chatConversations)
    .values({ userAId: a, userBId: b })
    .returning();

  return created;
}

// Публичная функция getUserBasic для внешнего использования модуля.
export async function getUserBasic(userId: string) {
  const [u] = await db
    .select({ id: users.id, name: users.name, image: users.image, email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  return u ?? null;
}

