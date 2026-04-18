import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, collectionItems, mediaItems, friendships } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import UserProfileClient from "@/components/friends/UserProfileClient";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const { id } = await params;
  if (id === session.user.id) redirect("/profile");

  const [profileUser] = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(eq(users.id, id));

  if (!profileUser) notFound();

  // Показываем чужую коллекцию только для подтвержденных друзей.
  const [friendship] = await db.select().from(friendships).where(
    or(
      and(eq(friendships.requesterId, session.user.id), eq(friendships.addresseeId, id)),
      and(eq(friendships.requesterId, id), eq(friendships.addresseeId, session.user.id))
    )
  );

  const isFriend = friendship?.status === "accepted";

  const items = isFriend ? await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(eq(collectionItems.userId, id)) : [];

  const collection = items.map(({ collection_item, media_item }) => ({
    ...collection_item,
    mediaItem: media_item,
  }));

  return (
    <UserProfileClient
      profileUser={profileUser}
      currentUserId={session.user.id}
      friendship={friendship ?? null}
      collection={collection}
      isFriend={isFriend}
    />
  );
}