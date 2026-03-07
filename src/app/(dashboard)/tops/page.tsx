import TopsClient from "@/components/tops/TopsClient";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function TopsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Топы 🏆</h1>
        <p className="text-muted-foreground mt-1">Лучшие фильмы, сериалы, игры и книги в мире</p>
      </div>
      <TopsClient />
    </div>
  );
}