import { limits } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { friendships, users } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";

// GET — список друзей и заявок
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.user.id;

  const all = await db
    .select({
      id: friendships.id,
      status: friendships.status,
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
      createdAt: friendships.createdAt,
      requester: { id: users.id, name: users.name, image: users.image, email: users.email },
    })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.requesterId))
    .where(or(eq(friendships.requesterId, uid), eq(friendships.addresseeId, uid)));

  // Enrich with addressee info too
  const enriched = await Promise.all(all.map(async (f) => {
    const otherId = f.requesterId === uid ? f.addresseeId : f.requesterId;
    const [other] = await db.select({ id: users.id, name: users.name, image: users.image, email: users.email })
      .from(users).where(eq(users.id, otherId));
    return { ...f, other };
  }));

  const friends = enriched.filter((f) => f.status === "accepted");
  const incoming = enriched.filter((f) => f.status === "pending" && f.addresseeId === uid);
  const outgoing = enriched.filter((f) => f.status === "pending" && f.requesterId === uid);

  return NextResponse.json({ friends, incoming, outgoing });
}

// POST — отправить заявку
export async function POST(req: NextRequest) {
  const { success } = limits.friends(req);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { addresseeId } = await req.json();
  if (!addresseeId) return NextResponse.json({ error: "addresseeId required" }, { status: 400 });
  if (addresseeId === session.user.id) return NextResponse.json({ error: "Нельзя добавить себя" }, { status: 400 });

  // Check existing
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