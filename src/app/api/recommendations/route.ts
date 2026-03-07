import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { collectionItems, mediaItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seed = parseInt(req.nextUrl.searchParams.get("seed") ?? "0");

  const completed = await db
    .select()
    .from(collectionItems)
    .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
    .where(and(eq(collectionItems.userId, session.user.id), eq(collectionItems.status, "COMPLETED")))
    .limit(20);

  if (completed.length === 0) {
    return NextResponse.json({ recommendations: [], reason: "empty" });
  }

  const allInCollection = await db
    .select({ mediaItemId: collectionItems.mediaItemId })
    .from(collectionItems)
    .where(eq(collectionItems.userId, session.user.id));
  const collectionIds = new Set(allInCollection.map((i) => i.mediaItemId));

  const genreCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = { movie: 0, book: 0, game: 0 };
  completed.forEach(({ collection_item, media_item }) => {
    typeCounts[media_item.type] = (typeCounts[media_item.type] ?? 0) + 1;
    media_item.genres?.forEach((g) => {
      genreCounts[g] = (genreCounts[g] ?? 0) + (collection_item.rating ?? 1);
    });
  });

  const allGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  const page = (seed % 3) + 1;
  const results: any[] = [];

  // ── Kinopoisk: 3 разных запроса по разным жанрам ──────────────────
  if (process.env.KINOPOISK_API_KEY) {
    const queries = [
      allGenres[seed % Math.max(allGenres.length, 1)] ?? "драма",
      allGenres[(seed + 1) % Math.max(allGenres.length, 1)] ?? "комедия",
      allGenres[(seed + 2) % Math.max(allGenres.length, 1)] ?? "триллер",
    ];
    // dedupe queries
    const uniqueQueries = [...new Set(queries)].slice(0, 3);

    for (const q of uniqueQueries) {
      try {
        const res = await fetch(
          `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(q)}&page=${page}`,
          { headers: { "X-API-KEY": process.env.KINOPOISK_API_KEY }, cache: "no-store" }
        );
        const data = await res.json();
        const films = (data.films ?? [])
          .filter((f: any) => !collectionIds.has(`kp_${f.filmId}`) && f.nameRu)
          .slice(0, 3);
        films.forEach((f: any) => {
          results.push({
            title: f.nameRu ?? f.nameEn ?? "Unknown",
            type: "movie",
            year: f.year ? parseInt(f.year) : null,
            genres: f.genres?.map((g: any) => g.genre) ?? [],
            posterUrl: f.posterUrl ?? null,
            reason: `Соответствует твоим интересам — жанр «${q}»`,
            externalUrl: `https://www.kinopoisk.ru/film/${f.filmId}`,
            externalId: `kp_${f.filmId}`,
          });
        });
      } catch (e) { console.error("Kinopoisk error:", e); }
    }
  }

  // ── RAWG: 2 запроса с разной сортировкой ──────────────────────────
  if (process.env.RAWG_API_KEY) {
    const orderings = ["-rating", "-added", "-released", "-metacritic"];
    const pages = [page, page + 1];
    for (const p of pages) {
      const ordering = orderings[(seed + p) % orderings.length];
      try {
        const res = await fetch(
          `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&ordering=${ordering}&page=${p}&page_size=10`,
          { cache: "no-store" }
        );
        const data = await res.json();
        const games = (data.results ?? [])
          .filter((g: any) => !collectionIds.has(`rawg_${g.id}`))
          .slice(0, 3);
        games.forEach((g: any) => {
          results.push({
            title: g.name,
            type: "game",
            year: g.released ? new Date(g.released).getFullYear() : null,
            genres: g.genres?.map((gr: any) => gr.name) ?? [],
            posterUrl: g.background_image ?? null,
            reason: `Высоко оценённая игра с рейтингом ${g.rating?.toFixed(1) ?? "?"}/5`,
            externalUrl: `https://rawg.io/games/${g.slug}`,
            externalId: `rawg_${g.id}`,
          });
        });
      } catch (e) { console.error("RAWG error:", e); }
    }
  }

  // ── OpenLibrary: 2 запроса по разным жанрам ───────────────────────
  const bookQueries = [
    allGenres[seed % Math.max(allGenres.length, 1)] ?? "fiction",
    allGenres[(seed + 1) % Math.max(allGenres.length, 1)] ?? "adventure",
  ];
  const uniqueBookQueries = [...new Set(bookQueries)].slice(0, 2);

  for (const q of uniqueBookQueries) {
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year,cover_i,subject&limit=10&page=${page}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const offset = seed % 4;
      const books = (data.docs ?? [])
        .filter((b: any) => b.title && !collectionIds.has(`ol_${b.key?.replace("/works/", "")}`))
        .slice(offset, offset + 3);
      books.forEach((b: any) => {
        results.push({
          title: b.title,
          type: "book",
          year: b.first_publish_year ?? null,
          genres: b.subject?.slice(0, 3) ?? [],
          posterUrl: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg` : null,
          reason: `Книга по теме «${q}» — соответствует твоим интересам`,
          externalUrl: b.key ? `https://openlibrary.org${b.key}` : null,
          externalId: b.key ? `ol_${b.key.replace("/works/", "")}` : null,
        });
      });
    } catch (e) { console.error("OpenLibrary error:", e); }
  }

  // Dedupe by title+type
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = `${r.type}_${r.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Shuffle based on seed
  const shuffled = deduped.sort(() => Math.sin(seed * 9301 + deduped.indexOf(deduped[0])) - 0.5);

  return NextResponse.json({ recommendations: shuffled });
}