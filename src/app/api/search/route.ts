import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { limits } from "@/lib/rate-limit";

function getEnvKey(name: string): string | null {
  const raw = process.env[name];
  if (!raw) return null;
  // На хостингах ключи иногда вставляются в кавычках — нормализуем значение.
  return raw.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

export async function GET(req: NextRequest) {
  const { success } = limits.search(req);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const type = req.nextUrl.searchParams.get("type") ?? "all"; // movie | book | game | all
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1"));
  const limitRaw = parseInt(req.nextUrl.searchParams.get("limit") ?? "10");
  const pageSize = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 10;
  const kinopoiskApiKey = getEnvKey("KINOPOISK_API_KEY");
  const rawgApiKey = getEnvKey("RAWG_API_KEY");

  if (!q || q.length < 2) return NextResponse.json({ results: [], hasMore: false });

  const results: any[] = [];
  let hasMore = false;

  if ((type === "all" || type === "movie") && kinopoiskApiKey) {
    try {
      const res = await fetch(
        `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(q)}&page=${page}`,
        { headers: { "X-API-KEY": kinopoiskApiKey }, cache: "no-store" }
      );
      if (!res.ok) {
        console.error("[search:movie] Kinopoisk response error", res.status);
      }
      const data = await res.json();
      const films = data.films ?? [];
      if (data.pagesCount > page) hasMore = true;
      films.slice(0, pageSize).forEach((f: any) => {
        results.push({
          id: `kp_${f.filmId}`,
          externalId: `kp_${f.filmId}`,
          type: "movie",
          title: f.nameRu ?? f.nameEn ?? "Unknown",
          originalTitle: f.nameEn ?? null,
          year: f.year ? parseInt(f.year) : null,
          posterUrl: f.posterUrlPreview ?? f.posterUrl ?? null,
          genres: f.genres?.map((g: any) => g.genre) ?? [],
          externalUrl: `https://www.kinopoisk.ru/film/${f.filmId}`,
          externalRating: null,
          description: null,
          director: null,
          author: null,
          developer: null,
        });
      });
    } catch (error) {
      console.error("[search:movie] Kinopoisk request failed", error);
    }
  }

  if (type === "all" || type === "book") {
    try {
      const offset = (page - 1) * pageSize;
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year,cover_i,subject,numFound&limit=${pageSize}&offset=${offset}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if ((data.numFound ?? 0) > offset + pageSize) hasMore = true;
      (data.docs ?? []).slice(0, pageSize).forEach((b: any) => {
        const olId = b.key?.replace("/works/", "") ?? "";
        results.push({
          id: `ol_${olId}`,
          externalId: `ol_${olId}`,
          type: "book",
          title: b.title,
          originalTitle: null,
          year: b.first_publish_year ?? null,
          posterUrl: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
          genres: b.subject?.slice(0, 3) ?? [],
          externalUrl: b.key ? `https://openlibrary.org${b.key}` : null,
          externalRating: null,
          description: null,
          director: null,
          author: b.author_name?.[0] ?? null,
          developer: null,
        });
      });
    } catch (error) {
      console.error("[search:book] OpenLibrary request failed", error);
    }
  }

  if ((type === "all" || type === "game") && rawgApiKey) {
    try {
      const res = await fetch(
        `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(q)}&page_size=${pageSize}&page=${page}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        console.error("[search:game] RAWG response error", res.status);
      }
      const data = await res.json();
      if (data.next) hasMore = true;
      (data.results ?? []).slice(0, pageSize).forEach((g: any) => {
        results.push({
          id: `rawg_${g.id}`,
          externalId: `rawg_${g.id}`,
          type: "game",
          title: g.name,
          originalTitle: null,
          year: g.released ? new Date(g.released).getFullYear() : null,
          posterUrl: g.background_image ?? null,
          genres: g.genres?.map((gr: any) => gr.name) ?? [],
          externalUrl: `https://rawg.io/games/${g.slug}`,
          externalRating: g.rating ? `${g.rating.toFixed(1)}/5` : null,
          description: null,
          director: null,
          author: null,
          developer: null,
        });
      });
    } catch (error) {
      console.error("[search:game] RAWG request failed", error);
    }
  }

  return NextResponse.json({ results, hasMore });
}