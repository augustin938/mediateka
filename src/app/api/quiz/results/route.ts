import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getQuizResultsByUser, insertQuizResult } from "@/lib/quiz-results";

function getCorrectAnswers(result: {
  score: number;
  correctAnswers: number | null;
}) {
  return result.correctAnswers ?? result.score;
}

function getPoints(result: {
  score: number;
  points: number | null;
  correctAnswers: number | null;
}) {
  return result.points ?? getCorrectAnswers(result);
}

const QuizResultSchema = z.object({
  mode:           z.enum(["classic", "endless"]).default("classic"),
  category:       z.enum(["all", "movie", "book", "game"]).default("all"),
  score:          z.number().int().min(0).max(1000).optional(),
  points:         z.number().int().min(0).max(1000).optional(),
  correctAnswers: z.number().int().min(0).max(100).optional(),
  total:          z.number().int().min(1).max(100),
  streak:         z.number().int().min(0).max(1000).default(0),
}).refine((data) => data.correctAnswers !== undefined || data.score !== undefined, {
  message: "Missing quiz result value",
  path: ["correctAnswers"],
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = QuizResultSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { mode, category, score, points, correctAnswers, total, streak } = parsed.data;
  const safeCorrectAnswers = correctAnswers ?? score ?? 0;
  const safePoints = points ?? score ?? safeCorrectAnswers;

  const result = await insertQuizResult({
    userId:         session.user.id,
    mode:           mode ?? "classic",
    category:       category ?? "all",
    score:          safeCorrectAnswers,
    points:         safePoints,
    correctAnswers: safeCorrectAnswers,
    total:          total ?? 10,
    streak:         streak ?? 0,
  });

  return NextResponse.json({ result });
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await getQuizResultsByUser(session.user.id, 20);

  // Для каждого режима считаем лучший результат, чтобы не зависеть от сортировки.
  const best = results.reduce((acc, r) => {
    const correct = getCorrectAnswers(r);
    const points = getPoints(r);

    if (r.mode === "classic") {
      const pct = Math.round((correct / r.total) * 100);
      if (!acc[r.mode] || pct > acc[r.mode]) acc[r.mode] = pct;
      return acc;
    }

    if (!acc[r.mode] || points > acc[r.mode]) acc[r.mode] = points;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ results, best });
}