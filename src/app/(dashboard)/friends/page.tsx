import FriendsClient from "@/components/friends/FriendsClient";
import NeonSectionHeader from "@/components/layout/NeonSectionHeader";
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
      <NeonSectionHeader
        title="Друзья"
        subtitle="Смотри коллекции друзей и делись своей"
      />
      <FriendsClient currentUserId={session.user.id} />
    </div>
  );
}