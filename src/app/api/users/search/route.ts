import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, friendships } from "@/lib/db/schema";
import { ilike, ne, eq, or, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ users: [] });

  const found = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(and(
      ne(users.id, session.user.id),
      or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`))
    ))
    .limit(10);

  // Get existing friendships to show status
  const existing = await db.select().from(friendships).where(
    or(eq(friendships.requesterId, session.user.id), eq(friendships.addresseeId, session.user.id))
  );

  const result = found.map((u) => {
    const rel = existing.find((f) =>
      (f.requesterId === session.user.id && f.addresseeId === u.id) ||
      (f.requesterId === u.id && f.addresseeId === session.user.id)
    );
    return { ...u, friendshipId: rel?.id ?? null, friendshipStatus: rel?.status ?? null };
  });

  return NextResponse.json({ users: result });
}