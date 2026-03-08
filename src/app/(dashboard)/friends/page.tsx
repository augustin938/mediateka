import FriendsClient from "@/components/friends/FriendsClient";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Друзья",
  description: "Смотри коллекции друзей и делись своей",
};
export default async function FriendsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Друзья</h1>
        <p className="text-muted-foreground mt-1">Смотри коллекции друзей и делись своей</p>
      </div>
      <FriendsClient currentUserId={session.user.id} />
    </div>
  );
}