import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Обрабатывает GET-запрос текущего API-маршрута.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") ?? "movies";
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");

  try {
    if (type === "movies") {
      const res = await fetch(
        `https://kinopoiskapiunofficial.tech/api/v2.2/films/top?type=TOP_250_BEST_FILMS&page=${page}`,
        { headers: { "X-API-KEY": process.env.KINOPOISK_API_KEY! }, cache: "force-cache" }
      );
      const data = await res.json();
      const items = (data.films ?? []).map((f: any, i: number) => ({
        rank: (page - 1) * 20 + i + 1,
        id: `kp_${f.filmId}`,
        externalId: `kp_${f.filmId}`,
        title: f.nameRu ?? f.nameEn ?? "Unknown",
        originalTitle: f.nameEn ?? null,
        year: f.year ? parseInt(f.year) : null,
        posterUrl: f.posterUrlPreview ?? f.posterUrl ?? null,
        rating: f.rating ?? null,
        type: "movie",
        externalUrl: `https://www.kinopoisk.ru/film/${f.filmId}`,
        genres: f.genres?.map((g: any) => g.genre) ?? [],
      }));
      return NextResponse.json({ items, totalPages: data.pagesCount ?? 1 });
    }

    if (type === "series") {
      const res = await fetch(
        `https://kinopoiskapiunofficial.tech/api/v2.2/films?type=TV_SERIES&ratingFrom=7&ratingTo=10&yearFrom=2000&yearTo=2024&page=${page}`,
        { headers: { "X-API-KEY": process.env.KINOPOISK_API_KEY! }, cache: "force-cache" }
      );
      const data = await res.json();
      const items = (data.items ?? []).map((f: any, i: number) => ({
        rank: (page - 1) * 20 + i + 1,
        id: `kp_${f.kinopoiskId}`,
        externalId: `kp_${f.kinopoiskId}`,
        title: f.nameRu ?? f.nameOriginal ?? f.nameEn ?? "Unknown",
        originalTitle: f.nameOriginal ?? f.nameEn ?? null,
        year: f.year ?? null,
        posterUrl: f.posterUrlPreview ?? f.posterUrl ?? null,
        rating: f.ratingKinopoisk ? `${f.ratingKinopoisk}` : f.ratingImdb ? `${f.ratingImdb}` : null,
        type: "movie",
        externalUrl: `https://www.kinopoisk.ru/film/${f.kinopoiskId}`,
        genres: f.genres?.map((g: any) => g.genre) ?? [],
      }));
      return NextResponse.json({ items, totalPages: data.totalPages ?? 1 });
    }

    if (type === "games") {
      const res = await fetch(
        `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&ordering=-rating&page_size=20&page=${page}&metacritic=80,100`,
        { cache: "force-cache" }
      );
      const data = await res.json();
      const items = (data.results ?? []).map((g: any, i: number) => ({
        rank: (page - 1) * 20 + i + 1,
        id: `rawg_${g.id}`,
        externalId: `rawg_${g.id}`,
        title: g.name,
        originalTitle: null,
        year: g.released ? new Date(g.released).getFullYear() : null,
        posterUrl: g.background_image ?? null,
        rating: g.metacritic ? `${g.metacritic}` : g.rating ? `${g.rating.toFixed(1)}` : null,
        type: "game",
        externalUrl: `https://rawg.io/games/${g.slug}`,
        genres: g.genres?.map((gr: any) => gr.name) ?? [],
      }));
      const totalPages = Math.ceil((data.count ?? 100) / 20);
      return NextResponse.json({ items, totalPages: Math.min(totalPages, 5) });
    }

    if (type === "books") {
      const subjects = ["fiction", "science", "history", "fantasy", "mystery"];
      const subject = subjects[(page - 1) % subjects.length];
      const res = await fetch(
        `https://openlibrary.org/subjects/${subject}.json?limit=20&offset=${(page - 1) * 20}`,
        { cache: "force-cache" }
      );
      const data = await res.json();
      const items = (data.works ?? []).map((b: any, i: number) => ({
        rank: (page - 1) * 20 + i + 1,
        id: `ol_${b.key?.replace("/works/", "")}`,
        externalId: `ol_${b.key?.replace("/works/", "")}`,
        title: b.title,
        originalTitle: null,
        year: b.first_publish_year ?? null,
        posterUrl: b.cover_id ? `https://covers.openlibrary.org/b/id/${b.cover_id}-M.jpg` : null,
        rating: null,
        type: "book",
        externalUrl: b.key ? `https://openlibrary.org${b.key}` : null,
        genres: b.subject?.slice(0, 2) ?? [],
        author: b.authors?.[0]?.name ?? null,
      }));
      return NextResponse.json({ items, totalPages: 5 });
    }

    return NextResponse.json({ items: [], totalPages: 1 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}