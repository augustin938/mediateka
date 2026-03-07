import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type"); // movie | book | game | null = all

  const conditions = [
    eq(collectionItems.userId, session.user.id),
    eq(collectionItems.status, "WANT"),
  ];

  const items = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(and(...conditions));

  const filtered = type ? items.filter((i) => i.media_item.type === type) : items;

  if (filtered.length === 0) {
    return NextResponse.json({ item: null });
  }

  const random = filtered[Math.floor(Math.random() * filtered.length)];
  return NextResponse.json({
    item: {
      ...random.collection_item,
      mediaItem: random.media_item,
    },
  });
}