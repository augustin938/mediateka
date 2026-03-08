import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seed = parseInt(req.nextUrl.searchParams.get("seed") ?? "0");

  const completed = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(and(eq(collectionItems.userId, session.user.id), eq(collectionItems.status, "COMPLETED")))
    .limit(30);

  if (completed.length === 0) {
    return NextResponse.json({ recommendations: [], reason: "empty" });
  }

  const allInCollection = await db
    .select({ mediaItemId: collectionItems.mediaItemId })
    .from(collectionItems)
    .where(eq(collectionItems.userId, session.user.id));
  const collectionIds = new Set(allInCollection.map((i) => i.mediaItemId));

  // Analyse collection
  const genreCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = { movie: 0, book: 0, game: 0 };
  const topRated = completed
    .filter(({ collection_item }) => (collection_item.rating ?? 0) >= 8)
    .map(({ media_item }) => media_item.title);

  completed.forEach(({ collection_item, media_item }) => {
    typeCounts[media_item.type] = (typeCounts[media_item.type] ?? 0) + 1;
    media_item.genres?.forEach((g) => {
      genreCounts[g] = (genreCounts[g] ?? 0) + (collection_item.rating ?? 3);
    });
  });

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  // Section buckets
  const movies: any[] = [];
  const books: any[] = [];
  const games: any[] = [];

  const page = (seed % 4) + 1;
  const page2 = ((seed + 1) % 4) + 1;

  // ── KINOPOISK ─────────────────────────────────────────────────────
  if (process.env.KINOPOISK_API_KEY) {
    // 4 genre queries for more variety
    const movieGenreMap: Record<string, string> = {
      "драма": "драма", "комедия": "комедия", "триллер": "триллер",
      "фантастика": "фантастика", "боевик": "боевик", "мелодрама": "мелодрама",
      "ужасы": "ужасы", "аниме": "аниме", "анимация": "анимация",
      "документальный": "документальный", "приключения": "приключения",
    };
    const pickGenres = topGenres
      .map((g) => movieGenreMap[g.toLowerCase()] ?? g)
      .filter(Boolean)
      .slice(0, 5);

    if (pickGenres.length < 3) pickGenres.push("драма", "комедия", "фантастика");

    const queries = [
      pickGenres[seed % pickGenres.length],
      pickGenres[(seed + 1) % pickGenres.length],
      pickGenres[(seed + 2) % pickGenres.length],
      pickGenres[(seed + 3) % pickGenres.length],
    ];
    const uniqueQ = [...new Set(queries)].slice(0, 4);

    for (const q of uniqueQ) {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(q)}&page=${page}`,
            { headers: { "X-API-KEY": process.env.KINOPOISK_API_KEY! }, cache: "no-store" }),
          fetch(`https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(q)}&page=${page2}`,
            { headers: { "X-API-KEY": process.env.KINOPOISK_API_KEY! }, cache: "no-store" }),
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        const films = [...(d1.films ?? []), ...(d2.films ?? [])]
          .filter((f: any) => !collectionIds.has(`kp_${f.filmId}`) && f.nameRu && f.posterUrl)
          .slice(0, 5);
        films.forEach((f: any) => {
          movies.push({
            title: f.nameRu ?? f.nameEn,
            type: "movie",
            year: f.year ? parseInt(f.year) : null,
            genres: f.genres?.map((g: any) => g.genre) ?? [],
            posterUrl: f.posterUrl ?? null,
            reason: `Жанр «${q}» — в твоём топе интересов`,
            externalUrl: `https://www.kinopoisk.ru/film/${f.filmId}`,
            externalId: `kp_${f.filmId}`,
            section: "По твоим жанрам",
          });
        });
      } catch (e) { console.error("Kinopoisk error:", e); }
    }

    // Also fetch top films (popular)
    try {
      const r = await fetch(
        `https://kinopoiskapiunofficial.tech/api/v2.2/films?order=NUM_VOTE&type=ALL&page=${page}`,
        { headers: { "X-API-KEY": process.env.KINOPOISK_API_KEY! }, cache: "no-store" }
      );
      const d = await r.json();
      (d.items ?? [])
        .filter((f: any) => !collectionIds.has(`kp_${f.kinopoiskId}`) && f.nameRu && f.posterUrl)
        .slice(0, 6)
        .forEach((f: any) => {
          movies.push({
            title: f.nameRu ?? f.nameEn,
            type: "movie",
            year: f.year ?? null,
            genres: f.genres?.map((g: any) => g.genre) ?? [],
            posterUrl: f.posterUrl ?? null,
            reason: `Популярный фильм с высоким рейтингом`,
            externalUrl: `https://www.kinopoisk.ru/film/${f.kinopoiskId}`,
            externalId: `kp_${f.kinopoiskId}`,
            section: "Популярное",
          });
        });
    } catch (e) { console.error("Kinopoisk top error:", e); }
  }

  // ── RAWG ──────────────────────────────────────────────────────────
  if (process.env.RAWG_API_KEY) {
    const orderings = ["-rating", "-added", "-released", "-metacritic"];

    // 3 different pages/orderings for variety
    const rawgFetches = [
      { ordering: orderings[seed % 4], page: page, section: "Топ игр" },
      { ordering: orderings[(seed + 1) % 4], page: page2, section: "Новые игры" },
      { ordering: "-metacritic", page: page, section: "По оценкам критиков" },
    ];

    await Promise.all(rawgFetches.map(async ({ ordering, page: p, section }) => {
      try {
        const res = await fetch(
          `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&ordering=${ordering}&page=${p}&page_size=15`,
          { cache: "no-store" }
        );
        const data = await res.json();
        (data.results ?? [])
          .filter((g: any) => !collectionIds.has(`rawg_${g.id}`) && g.background_image)
          .slice(0, 6)
          .forEach((g: any) => {
            games.push({
              title: g.name,
              type: "game",
              year: g.released ? new Date(g.released).getFullYear() : null,
              genres: g.genres?.map((gr: any) => gr.name) ?? [],
              posterUrl: g.background_image ?? null,
              reason: `Рейтинг ${g.rating?.toFixed(1) ?? "?"}/5${g.metacritic ? ` · Metacritic ${g.metacritic}` : ""}`,
              externalUrl: `https://rawg.io/games/${g.slug}`,
              externalId: `rawg_${g.id}`,
              section,
            });
          });
      } catch (e) { console.error("RAWG error:", e); }
    }));
  }

  // ── OPENLIBRARY ───────────────────────────────────────────────────
  const bookGenres = [
    topGenres[seed % Math.max(topGenres.length, 1)] ?? "fiction",
    topGenres[(seed + 1) % Math.max(topGenres.length, 1)] ?? "adventure",
    topGenres[(seed + 2) % Math.max(topGenres.length, 1)] ?? "thriller",
    "bestseller",
  ];
  const uniqueBookQ = [...new Set(bookGenres)].slice(0, 4);

  await Promise.all(uniqueBookQ.map(async (q, qi) => {
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year,cover_i,subject&limit=15&page=${qi % 2 === 0 ? page : page2}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const offset = (seed + qi * 3) % 6;
      (data.docs ?? [])
        .filter((b: any) => b.title && b.cover_i && !collectionIds.has(`ol_${b.key?.replace("/works/", "")}`))
        .slice(offset, offset + 5)
        .forEach((b: any) => {
          books.push({
            title: b.title,
            type: "book",
            year: b.first_publish_year ?? null,
            genres: b.subject?.slice(0, 3) ?? [],
            posterUrl: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg` : null,
            reason: q === "bestseller"
              ? `Бестселлер — высоко оценён читателями`
              : `Тема «${q}» — близко к твоим интересам`,
            externalUrl: b.key ? `https://openlibrary.org${b.key}` : null,
            externalId: b.key ? `ol_${b.key.replace("/works/", "")}` : null,
            section: q === "bestseller" ? "Бестселлеры" : "По твоим жанрам",
          });
        });
    } catch (e) { console.error("OpenLibrary error:", e); }
  }));

  // Dedupe each bucket
  function dedupe(arr: any[]): any[] {
    const seen = new Set<string>();
    return arr.filter((r) => {
      const key = `${r.type}_${r.title.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const allRecs = [
    ...seededShuffle(dedupe(movies), seed),
    ...seededShuffle(dedupe(games), seed + 1),
    ...seededShuffle(dedupe(books), seed + 2),
  ];

  // Final dedupe across all types
  const finalSeen = new Set<string>();
  const final = allRecs.filter((r) => {
    const key = `${r.type}_${r.title.toLowerCase().trim()}`;
    if (finalSeen.has(key)) return false;
    finalSeen.add(key);
    return true;
  });

  return NextResponse.json({
    recommendations: final,
    meta: {
      topGenres: topGenres.slice(0, 5),
      typeCounts,
      total: final.length,
    },
  });
}