import ProfileClient from "@/components/profile/ProfileClient";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const items = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(eq(collectionItems.userId, session.user.id));

  const stats = {
    total: items.length,
    completed: items.filter((i) => i.collection_item.status === "COMPLETED").length,
    inProgress: items.filter((i) => i.collection_item.status === "IN_PROGRESS").length,
    want: items.filter((i) => i.collection_item.status === "WANT").length,
    movies: items.filter((i) => i.media_item.type === "movie").length,
    books: items.filter((i) => i.media_item.type === "book").length,
    games: items.filter((i) => i.media_item.type === "game").length,
    avgRating: (() => {
      const rated = items.filter((i) => i.collection_item.rating !== null);
      if (!rated.length) return null;
      return (rated.reduce((s, i) => s + (i.collection_item.rating ?? 0), 0) / rated.length).toFixed(1);
    })(),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Профиль</h1>
        <p className="text-muted-foreground mt-1">Настройки аккаунта и статистика</p>
      </div>
      <ProfileClient
        user={{
          id: session.user.id,
          name: session.user.name ?? "",
          email: session.user.email,
          image: (session.user as any).image ?? null,
        }}
        stats={stats}
      />
    </div>
  );
}