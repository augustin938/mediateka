import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { chatConversations, chatMessages, chatMessageReactions, collectionItems, mediaItems, notifications, users } from "@/lib/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { assertFriends, getOrCreateConversation, normalizePair } from "@/lib/chat/server";
import { publishConversationEvent } from "@/lib/chat/pubsub";

function parseIntSafe(v: string | null, d: number) {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : d;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const withUserId = url.searchParams.get("with");
  if (!withUserId) return NextResponse.json({ error: "with is required" }, { status: 400 });

  const limit = Math.min(100, Math.max(1, parseIntSafe(url.searchParams.get("limit"), 40)));

  try {
    await assertFriends(session.user.id, withUserId);
  } catch {
    return NextResponse.json({ error: "Not friends" }, { status: 403 });
  }

  const [a, b] = normalizePair(session.user.id, withUserId);
  const [conversation] = await db
    .select()
    .from(chatConversations)
    .where(and(eq(chatConversations.userAId, a), eq(chatConversations.userBId, b)));

  if (!conversation) return NextResponse.json({ conversation: null, messages: [] });

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversation.id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  const messageIds = rows.map((m) => m.id);
  const reactions = messageIds.length
    ? await db
        .select()
        .from(chatMessageReactions)
        .where(inArray(chatMessageReactions.messageId, messageIds))
    : [];

  const reactionsByMessage = new Map<string, { emoji: string; count: number; mine: boolean }[]>();
  for (const r of reactions) {
    const list = reactionsByMessage.get(r.messageId) ?? [];
    const idx = list.findIndex((x) => x.emoji === r.emoji);
    if (idx === -1) list.push({ emoji: r.emoji, count: 1, mine: r.userId === session.user.id });
    else {
      list[idx] = {
        ...list[idx],
        count: list[idx].count + 1,
        mine: list[idx].mine || r.userId === session.user.id,
      };
    }
    reactionsByMessage.set(r.messageId, list);
  }

  return NextResponse.json({
    conversation,
    messages: rows.map((m) => ({
      ...m,
      deleted: Boolean(m.deletedAt),
      reactions: reactionsByMessage.get(m.id) ?? [],
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const toUserId = body?.toUserId as string | undefined;
  const text = (body?.text as string | undefined)?.trim() ?? "";
  const collectionItemId = body?.collectionItemId as string | undefined;

  if (!toUserId) return NextResponse.json({ error: "toUserId required" }, { status: 400 });
  if (!text && !collectionItemId) return NextResponse.json({ error: "text or collectionItemId required" }, { status: 400 });

  try {
    await assertFriends(session.user.id, toUserId);
  } catch {
    return NextResponse.json({ error: "Not friends" }, { status: 403 });
  }

  const [sender] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id));

  const conversation = await getOrCreateConversation(session.user.id, toUserId);

  let values: any = {
    conversationId: conversation.id,
    senderId: session.user.id,
    type: collectionItemId ? "share" : "text",
    text: text || null,
    sharedCollectionItemId: collectionItemId ?? null,
  };

  if (collectionItemId) {
    // Validate ownership + snapshot fields.
    const [row] = await db
      .select({
        id: collectionItems.id,
        userId: collectionItems.userId,
        title: mediaItems.title,
        type: mediaItems.type,
        year: mediaItems.year,
        posterUrl: mediaItems.posterUrl,
      })
      .from(collectionItems)
      .innerJoin(mediaItems, eq(mediaItems.id, collectionItems.mediaItemId))
      .where(eq(collectionItems.id, collectionItemId));

    if (!row || row.userId !== session.user.id) {
      return NextResponse.json({ error: "Invalid collectionItemId" }, { status: 400 });
    }

    values = {
      ...values,
      sharedTitle: row.title,
      sharedType: row.type,
      sharedYear: row.year,
      sharedPosterUrl: row.posterUrl,
    };
  }

  const [created] = await db
    .insert(chatMessages)
    .values(values)
    .returning();

  await db
    .update(chatConversations)
    .set({ updatedAt: new Date(), lastMessageAt: created.createdAt })
    .where(eq(chatConversations.id, conversation.id));

  // Notification for receiver.
  try {
    const isShare = Boolean(collectionItemId);
    const senderName = sender?.name ?? "Друг";
    const title = `Новое сообщение от ${senderName}`;
    const bodyText = isShare
      ? `Поделился: ${created.sharedTitle ?? "элементом из коллекции"}`
      : (text.length > 120 ? `${text.slice(0, 120)}…` : text);

    await db.insert(notifications).values({
      userId: toUserId,
      type: "message",
      title,
      body: bodyText || "Новое сообщение",
      read: false,
      link: `/friends?chat=${session.user.id}`,
      createdAt: new Date(),
    });
  } catch {
    // ignore notification errors
  }

  publishConversationEvent(conversation.id, { type: "message:new", message: created });

  return NextResponse.json({ conversation, message: created }, { status: 201 });
}

