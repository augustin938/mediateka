import SearchSection from "@/components/search/SearchSection";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Поиск",
  description: "Найди что-нибудь интересное для своей коллекции",
};
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { q, type } = await searchParams;

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          Привет, {session?.user?.name?.split(" ")[0] ?? "пользователь"} 👋
        </h1>
        <p className="text-muted-foreground">
          Найди что-нибудь интересное для своей коллекции
        </p>
      </div>
      <SearchSection key={q ?? ""} initialQuery={q} initialType={type} />
    </div>
  );
}