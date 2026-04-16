import { limits } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

function pick<T>(arr: T[], n: number, exclude?: T): T[] {
  const pool = exclude !== undefined ? arr.filter((x) => x !== exclude) : arr;
  return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
}

export async function GET(req: Request) {
  const { success } = limits.quiz(req);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "all";
  const count    = Math.min(parseInt(searchParams.get("count") ?? "10"), 30);

  const conditions: any[] = [
    eq(collectionItems.userId, session.user.id),
    eq(collectionItems.status, "COMPLETED"),
  ];
  if (category !== "all") conditions.push(eq(mediaItems.type, category as any));

  const rows = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(and(...conditions));

  const filteredRows = category === "all"
    ? rows
    : rows.filter((row) => row.media_item.type === category);

  if (filteredRows.length < 4) {
    return NextResponse.json({ error: "not_enough", min: 4 });
  }

  const pool      = [...filteredRows].sort(() => Math.random() - 0.5).slice(0, count);
  const allTitles = filteredRows.map((r) => r.media_item.title);

  const questions = pool.map((row, i) => {
    const { media_item, collection_item } = row;

    const available: string[] = [];
    if (media_item.description)       available.push("description");
    if (media_item.year)              available.push("year");
    if (media_item.genres?.length)    available.push("genre");
    if (collection_item.rating)       available.push("rating");
    if (media_item.posterUrl)         available.push("poster");
    if (media_item.posterUrl)         available.push("poster_reveal");
    const creator = media_item.director ?? media_item.author ?? media_item.developer;
    if (creator)                      available.push("creator");
    if (available.length === 0)       available.push("description");

    const qType = available[Math.floor(Math.random() * available.length)];

    const wrongTitles = pick(allTitles, 3, media_item.title);
    const options     = [...wrongTitles, media_item.title].sort(() => Math.random() - 0.5);

    const getCreator = (r: typeof row) =>
      r.media_item.director ?? r.media_item.author ?? r.media_item.developer ?? null;
    const thisCreator   = getCreator(row);
    const wrongCreators = filteredRows.map(getCreator).filter((c): c is string => !!c && c !== thisCreator);
    const creatorOptions = thisCreator
      ? [...pick(wrongCreators, 3), thisCreator].sort(() => Math.random() - 0.5)
      : options;

    // Genre options: wrong answers must NOT share all genres with the correct answer
    // Pick titles from rows whose genres don't overlap much with this item's genres
    const thisGenres = new Set((media_item.genres ?? []).map((g) => g.toLowerCase()));
    const genreWrongTitles = filteredRows
      .filter((r) => {
        if (r.media_item.title === media_item.title) return false;
        const otherGenres = (r.media_item.genres ?? []).map((g) => g.toLowerCase());
        // exclude if they share more than half the genres
        const shared = otherGenres.filter((g) => thisGenres.has(g)).length;
        return shared < Math.ceil(thisGenres.size / 2);
      })
      .map((r) => r.media_item.title);
    // Fallback to any wrong titles if not enough genre-distinct ones
    const safeWrong = genreWrongTitles.length >= 3
      ? pick(genreWrongTitles, 3)
      : pick(allTitles.filter((t) => t !== media_item.title), 3);
    const genreOptions = [...safeWrong, media_item.title].sort(() => Math.random() - 0.5);

    let question = "";
    let hint     = "";

    switch (qType) {
      case "description":
        question = media_item.description
          ? `${media_item.description.slice(0, 220)}${media_item.description.length > 220 ? "..." : ""}`
          : `Это ${media_item.type === "movie" ? "фильм" : media_item.type === "book" ? "книга" : "игра"} из твоей коллекции.`;
        hint = "Угадай по описанию";
        break;
      case "year":
        question = `Этот контент вышел в ${media_item.year} году.`;
        hint     = `Год выхода: ${media_item.year}`;
        break;
      case "genre":
        question = `Жанры: ${media_item.genres?.slice(0, 3).join(", ")}`;
        hint     = "Угадай по жанрам";
        break;
      case "rating":
        question = `Ты поставил этому ${media_item.type === "movie" ? "фильму" : media_item.type === "book" ? "произведению" : "проекту"} оценку ${collection_item.rating}/10.`;
        hint     = `Твоя оценка: ${collection_item.rating}/10`;
        break;
      case "poster":
        question = media_item.posterUrl ?? "";
        hint     = "Угадай по постеру";
        break;
      case "poster_reveal":
        question = media_item.posterUrl ?? "";
        hint     = "Постер откроется постепенно…";
        break;
      case "creator": {
        const label = media_item.type === "movie" ? "режиссёр" : media_item.type === "book" ? "автор" : "разработчик";
        question = `${thisCreator} — ${label} этого произведения. Что это за ${media_item.type === "movie" ? "фильм" : media_item.type === "book" ? "книга" : "игра"}?`;
        hint     = `${label.charAt(0).toUpperCase() + label.slice(1)}: ${thisCreator}`;
        break;
      }
    }

    return {
      id:        i,
      type:      qType,
      mediaType: media_item.type,
      question,
      hint,
      options:   qType === "creator" ? creatorOptions : qType === "genre" ? genreOptions : options,
      answer:    media_item.title,
      title:     media_item.title,
      year:      media_item.year ?? null,
      genres:    media_item.genres ?? [],
      posterUrl: media_item.posterUrl ?? null,
      creator:   thisCreator ?? null,
      review:    collection_item.review ?? null,
      rating:    collection_item.rating ?? null,
    };
  });

  return NextResponse.json({ questions, total: filteredRows.length });
}