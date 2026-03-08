import RandomPicker from "@/components/random/RandomPicker";
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
      <div>
        <h1 className="font-display text-3xl font-bold">Что сегодня? 🎲</h1>
        <p className="text-muted-foreground mt-1">Случайный выбор из твоего списка «Хочу»</p>
      </div>
      <RandomPicker />
    </div>
  );
}