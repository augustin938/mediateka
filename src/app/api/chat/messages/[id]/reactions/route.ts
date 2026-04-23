import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { chatMessageReactions, chatMessages, chatConversations } from "@/lib/db/schema";
import { and, eq, or } from "drizzle-orm";
import { publishConversationEvent } from "@/lib/chat/pubsub";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { emoji } = await req.json();
  if (!emoji || typeof emoji !== "string") return NextResponse.json({ error: "emoji required" }, { status: 400 });

  const [msg] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Toggle reaction.
  const [existing] = await db
    .select()
    .from(chatMessageReactions)
    .where(and(eq(chatMessageReactions.messageId, id), eq(chatMessageReactions.userId, session.user.id), eq(chatMessageReactions.emoji, emoji)));

  if (existing) {
    await db
      .delete(chatMessageReactions)
      .where(and(eq(chatMessageReactions.messageId, id), eq(chatMessageReactions.userId, session.user.id), eq(chatMessageReactions.emoji, emoji)));
    publishConversationEvent(msg.conversationId, { type: "reaction:removed", messageId: id, emoji, userId: session.user.id });
    return NextResponse.json({ active: false });
  }

  await db
    .insert(chatMessageReactions)
    .values({ messageId: id, userId: session.user.id, emoji })
    .onConflictDoNothing();

  publishConversationEvent(msg.conversationId, { type: "reaction:added", messageId: id, emoji, userId: session.user.id });
  return NextResponse.json({ active: true });
}

