import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { friendships, users, notifications } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const [updated] = await db.update(friendships)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(friendships.id, id), eq(friendships.addresseeId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Notify requester if accepted
  if (status === "accepted") {
    const [accepter] = await db.select({ name: users.name }).from(users).where(eq(users.id, session.user.id));
    await db.insert(notifications).values({
      userId: updated.requesterId,
      type: "friend_accepted",
      title: "Заявка принята!",
      body: `${accepter?.name ?? "Пользователь"} принял твою заявку в друзья`,
      link: `/user/${session.user.id}`,
    });
  }

  return NextResponse.json({ friendship: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db.delete(friendships).where(
    and(
      eq(friendships.id, id),
      or(eq(friendships.requesterId, session.user.id), eq(friendships.addresseeId, session.user.id))
    )
  );

  return NextResponse.json({ success: true });
}