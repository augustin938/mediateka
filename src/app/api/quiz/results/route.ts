import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizResults } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";


const QuizResultSchema = z.object({
  mode:     z.enum(["classic", "endless"]).default("classic"),
  category: z.enum(["all", "movie", "book", "game"]).default("all"),
  score:    z.number().int().min(0).max(1000),
  total:    z.number().int().min(1).max(100),
  streak:   z.number().int().min(0).max(1000).default(0),
});

// POST — save result
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = QuizResultSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { mode, category, score, total, streak } = parsed.data;

  const [result] = await db.insert(quizResults).values({
    userId:   session.user.id,
    mode:     mode ?? "classic",
    category: category ?? "all",
    score:    score ?? 0,
    total:    total ?? 10,
    streak:   streak ?? 0,
  }).returning();

  return NextResponse.json({ result });
}

// GET — last 20 results for profile
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await db
    .select()
    .from(quizResults)
    .where(eq(quizResults.userId, session.user.id))
    .orderBy(desc(quizResults.createdAt))
    .limit(20);

  // compute best score per mode
  const best = results.reduce((acc, r) => {
    const pct = Math.round((r.score / r.total) * 100);
    if (!acc[r.mode] || pct > acc[r.mode]) acc[r.mode] = pct;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ results, best });
}