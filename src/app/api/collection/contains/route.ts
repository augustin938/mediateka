import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems } from "@/lib/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";

type ShareKey = { type: "movie" | "book" | "game"; title: string; year?: number | null };

function keyOf(s: ShareKey) {
  return `${s.type}::${s.title}::${s.year ?? ""}`;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const mediaItemIds = Array.isArray(body?.mediaItemIds) ? body.mediaItemIds.filter((x: any) => typeof x === "string") : [];
  const shares: ShareKey[] = Array.isArray(body?.shares)
    ? body.shares
        .filter((x: any) => x && typeof x.title === "string" && (x.type === "movie" || x.type === "book" || x.type === "game"))
        .map((x: any) => ({ type: x.type, title: x.title, year: typeof x.year === "number" ? x.year : (x.year ?? null) }))
    : [];

  const ownedMediaItemIds = new Set<string>();

  if (mediaItemIds.length > 0) {
    const rows = await db
      .select({ mediaItemId: collectionItems.mediaItemId })
      .from(collectionItems)
      .where(and(eq(collectionItems.userId, session.user.id), inArray(collectionItems.mediaItemId, mediaItemIds)));
    rows.forEach((r) => ownedMediaItemIds.add(r.mediaItemId));
  }

  const ownedShareKeys = new Set<string>();

  if (shares.length > 0) {
    const unique = new Map<string, ShareKey>();
    shares.forEach((s) => unique.set(keyOf(s), s));
    const list = Array.from(unique.values());

    // Find media ids that match share snapshot.
    const mediaConditions = list.map((s) =>
      and(eq(mediaItems.type, s.type), eq(mediaItems.title, s.title), s.year == null ? undefined : eq(mediaItems.year, s.year))
    ).filter(Boolean) as any[];

    if (mediaConditions.length > 0) {
      const mediaRows = await db
        .select({ id: mediaItems.id, type: mediaItems.type, title: mediaItems.title, year: mediaItems.year })
        .from(mediaItems)
        .where(or(...mediaConditions));

      const matchedIds = mediaRows.map((m) => m.id);
      if (matchedIds.length > 0) {
        const owned = await db
          .select({ mediaItemId: collectionItems.mediaItemId })
          .from(collectionItems)
          .where(and(eq(collectionItems.userId, session.user.id), inArray(collectionItems.mediaItemId, matchedIds)));

        const ownedIds = new Set(owned.map((x) => x.mediaItemId));
        mediaRows.forEach((m) => {
          if (!ownedIds.has(m.id)) return;
          ownedShareKeys.add(`${m.type}::${m.title}::${m.year ?? ""}`);
          ownedShareKeys.add(`${m.type}::${m.title}::`); // fallback when year is missing in message
        });
      }
    }
  }

  return NextResponse.json({
    ownedMediaItemIds: Array.from(ownedMediaItemIds),
    ownedShareKeys: Array.from(ownedShareKeys),
  });
}

