import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems, collectionItemTags, tags } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import CollectionClient from "@/components/collection/CollectionClient";
import type { CollectionItemWithMedia } from "@/types";

export default async function CollectionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const items = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(eq(collectionItems.userId, session.user.id))
    .orderBy(desc(collectionItems.addedAt));

  // Загружаем все теги всех элементов одним запросом
  const itemIds = items.map((i) => i.collection_item.id);
  const allItemTags = itemIds.length > 0
    ? await db.select({ collectionItemId: collectionItemTags.collectionItemId, tag: tags })
        .from(collectionItemTags)
        .innerJoin(tags, eq(collectionItemTags.tagId, tags.id))
        .where(eq(tags.userId, session.user.id))
    : [];

  // Группируем теги по collectionItemId
  const tagsByItemId: Record<string, { id: string; name: string; color: string }[]> = {};
  for (const { collectionItemId, tag } of allItemTags) {
    if (!tagsByItemId[collectionItemId]) tagsByItemId[collectionItemId] = [];
    tagsByItemId[collectionItemId].push(tag);
  }

  const collection: CollectionItemWithMedia[] = items.map(({ collection_item, media_item }) => ({
    ...collection_item,
    mediaItem: media_item,
    tags: tagsByItemId[collection_item.id] ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Моя коллекция</h1>
        <p className="text-muted-foreground mt-1">
          {collection.length} {collection.length === 1 ? "элемент" : "элементов"}
        </p>
      </div>
      <CollectionClient initialItems={collection} />
    </div>
  );
}