import RandomPicker from "@/components/random/RandomPicker";
import NeonSectionHeader from "@/components/layout/NeonSectionHeader";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Сегодня",
  description: "Случайная рекомендация из твоей коллекции на сегодня",
};
export default async function RandomPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <NeonSectionHeader
        title="Что сегодня? 🎲"
        subtitle="Случайный выбор из твоего списка «Хочу»"
      />
      <RandomPicker />
    </div>
  );
}