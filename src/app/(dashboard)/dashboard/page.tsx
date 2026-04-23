import SearchSection from "@/components/search/SearchSection";
import AnimatedHeadline from "@/components/dashboard/AnimatedHeadline";
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
      <AnimatedHeadline name={session?.user?.name ?? "пользователь"} />
      <SearchSection key={q ?? ""} initialQuery={q} initialType={type} />
    </div>
  );
}