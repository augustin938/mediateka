import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { chatConversations, chatMessages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { publishConversationEvent } from "@/lib/chat/pubsub";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [msg] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (msg.senderId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [updated] = await db
    .update(chatMessages)
    .set({
      deletedAt: new Date(),
      deletedByUserId: session.user.id,
      text: null,
      sharedCollectionItemId: null,
      sharedTitle: null,
      sharedType: null,
      sharedYear: null,
      sharedPosterUrl: null,
    })
    .where(and(eq(chatMessages.id, id), eq(chatMessages.senderId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  publishConversationEvent(updated.conversationId, { type: "message:deleted", messageId: updated.id, deletedAt: updated.deletedAt });

  return NextResponse.json({ success: true });
}

