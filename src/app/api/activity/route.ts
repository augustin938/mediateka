import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// Обрабатывает GET-запрос текущего API-маршрута.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");

  const logs = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, session.user.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  return NextResponse.json({ logs });
}