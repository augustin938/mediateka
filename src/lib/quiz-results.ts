import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export interface StoredQuizResult {
  id: string;
  userId: string;
  mode: string;
  category: string;
  score: number;
  points: number | null;
  correctAnswers: number | null;
  total: number;
  streak: number;
  createdAt: Date;
}

type InsertQuizResultParams = {
  userId: string;
  mode: string;
  category: string;
  score: number;
  points: number;
  correctAnswers: number;
  total: number;
  streak: number;
};

// Важный внутренний helper normalizeQuizResultRow для локальной логики.
function normalizeQuizResultRow(row: Record<string, unknown>): StoredQuizResult {
  return {
    id: String(row.id),
    userId: String(row.userId),
    mode: String(row.mode),
    category: String(row.category),
    score: Number(row.score ?? 0),
    points: row.points === null || row.points === undefined ? null : Number(row.points),
    correctAnswers: row.correctAnswers === null || row.correctAnswers === undefined ? null : Number(row.correctAnswers),
    total: Number(row.total ?? 0),
    streak: Number(row.streak ?? 0),
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt)),
  };
}

let extendedQuizColumnsPromise: Promise<boolean> | null = null;

// Важный внутренний helper hasExtendedQuizResultColumns для локальной логики.
async function hasExtendedQuizResultColumns() {
  if (!extendedQuizColumnsPromise) {
    extendedQuizColumnsPromise = db.execute(sql<{ column_name: string }>`
      select column_name
      from information_schema.columns
      where table_name = 'quiz_result'
        and column_name in ('points', 'correct_answers')
    `).then((result) => result.rows.length === 2);
  }

  return extendedQuizColumnsPromise;
}

// Публичная функция insertQuizResult для внешнего использования модуля.
export async function insertQuizResult(params: InsertQuizResultParams) {
  const hasExtendedColumns = await hasExtendedQuizResultColumns();
  const id = crypto.randomUUID();

  if (hasExtendedColumns) {
    const result = await db.execute(sql<StoredQuizResult>`
      insert into quiz_result (
        id,
        user_id,
        mode,
        category,
        score,
        points,
        correct_answers,
        total,
        streak
      )
      values (
        ${id},
        ${params.userId},
        ${params.mode},
        ${params.category},
        ${params.score},
        ${params.points},
        ${params.correctAnswers},
        ${params.total},
        ${params.streak}
      )
      returning
        id,
        user_id as "userId",
        mode,
        category,
        score,
        points,
        correct_answers as "correctAnswers",
        total,
        streak,
        created_at as "createdAt"
    `);

    return result.rows[0] ? normalizeQuizResultRow(result.rows[0] as Record<string, unknown>) : null;
  }

  const result = await db.execute(sql<StoredQuizResult>`
    insert into quiz_result (
      id,
      user_id,
      mode,
      category,
      score,
      total,
      streak
    )
    values (
      ${id},
      ${params.userId},
      ${params.mode},
      ${params.category},
      ${params.correctAnswers},
      ${params.total},
      ${params.streak}
    )
    returning
      id,
      user_id as "userId",
      mode,
      category,
      score,
      null::integer as "points",
      null::integer as "correctAnswers",
      total,
      streak,
      created_at as "createdAt"
  `);

  return result.rows[0] ? normalizeQuizResultRow(result.rows[0] as Record<string, unknown>) : null;
}

// Публичная функция getQuizResultsByUser для внешнего использования модуля.
export async function getQuizResultsByUser(userId: string, limit = 20) {
  const hasExtendedColumns = await hasExtendedQuizResultColumns();
  const pointsColumn = hasExtendedColumns ? sql`points` : sql`null::integer`;
  const correctAnswersColumn = hasExtendedColumns ? sql`correct_answers` : sql`null::integer`;

  const result = await db.execute(sql<StoredQuizResult>`
    select
      id,
      user_id as "userId",
      mode,
      category,
      score,
      ${pointsColumn} as "points",
      ${correctAnswersColumn} as "correctAnswers",
      total,
      streak,
      created_at as "createdAt"
    from quiz_result
    where user_id = ${userId}
    order by created_at desc
    limit ${limit}
  `);

  return result.rows.map((row) => normalizeQuizResultRow(row as Record<string, unknown>));
}
