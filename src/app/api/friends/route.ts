import { limits } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { friendships, users } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.user.id;
  const requester = alias(users, "requester");
  const addressee = alias(users, "addressee");

  const all = await db
    .select({
      id: friendships.id,
      status: friendships.status,
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
      createdAt: friendships.createdAt,
      requester: { id: requester.id, name: requester.name, image: requester.image, email: requester.email },
      addressee: { id: addressee.id, name: addressee.name, image: addressee.image, email: addressee.email },
    })
    .from(friendships)
    .innerJoin(requester, eq(requester.id, friendships.requesterId))
    .innerJoin(addressee, eq(addressee.id, friendships.addresseeId))
    .where(or(eq(friendships.requesterId, uid), eq(friendships.addresseeId, uid)));

  const enriched = all.map((f) => ({
    ...f,
    other: f.requesterId === uid ? f.addressee : f.requester,
  }));

  const friends = enriched.filter((f) => f.status === "accepted");
  const incoming = enriched.filter((f) => f.status === "pending" && f.addresseeId === uid);
  const outgoing = enriched.filter((f) => f.status === "pending" && f.requesterId === uid);

  return NextResponse.json({ friends, incoming, outgoing });
}

export async function POST(req: NextRequest) {
  const { success } = limits.friends(req);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { addresseeId } = await req.json();
  if (!addresseeId) return NextResponse.json({ error: "addresseeId required" }, { status: 400 });
  if (addresseeId === session.user.id) return NextResponse.json({ error: "Нельзя добавить себя" }, { status: 400 });

  // Не создаем дубликат, если между пользователями уже есть связь.
  const [existing] = await db.select().from(friendships).where(
    or(
      and(eq(friendships.requesterId, session.user.id), eq(friendships.addresseeId, addresseeId)),
      and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, session.user.id))
    )
  );
  if (existing) return NextResponse.json({ error: "Заявка уже существует" }, { status: 409 });

  const [friendship] = await db.insert(friendships).values({
    requesterId: session.user.id,
    addresseeId,
  }).returning();

  return NextResponse.json({ friendship }, { status: 201 });
}