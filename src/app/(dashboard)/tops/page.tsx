import TopsClient from "@/components/tops/TopsClient";
import NeonSectionHeader from "@/components/layout/NeonSectionHeader";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Топы",
  description: "Лучшее из твоей коллекции по категориям",
};
export default async function TopsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <NeonSectionHeader
        title="Топы"
        subtitle="Лучшие фильмы, сериалы, игры и книги в мире"
        badge="🏆"
      />
      <TopsClient />
    </div>
  );
}