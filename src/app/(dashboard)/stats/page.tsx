import StatsClient from "@/components/stats/StatsClient";
import NeonSectionHeader from "@/components/layout/NeonSectionHeader";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Статистика",
  description: "Подробная статистика твоей коллекции",
};
export default async function StatsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <NeonSectionHeader
        title="Статистика 📊"
        subtitle="Твоя медиаактивность в цифрах и графиках"
      />
      <StatsClient />
    </div>
  );
}