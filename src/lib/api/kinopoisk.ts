import type { MediaItem } from "@/lib/db/schema";

const KP_BASE = "https://kinopoiskapiunofficial.tech/api";
const API_KEY = process.env.KINOPOISK_API_KEY;

export async function searchKinopoisk(
  query: string
): Promise<Omit<MediaItem, "createdAt" | "updatedAt">[]> {
  if (!API_KEY) {
    console.warn("KINOPOISK_API_KEY not set");
    return [];
  }

  const url = `${KP_BASE}/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(query)}&page=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Kinopoisk error:", res.status);
      return [];
    }

    const data = await res.json();

    return (data.films ?? []).slice(0, 10).map((item: any) => ({
      id: `kp_${item.filmId}`,
      externalId: String(item.filmId),
      type: "movie" as const,
      title: item.nameRu ?? item.nameEn ?? "Unknown",
      originalTitle: item.nameEn ?? null,
      description: item.description ?? null,
      posterUrl: item.posterUrl ?? null,
      year: item.year ? parseInt(item.year) : null,
      genres: item.genres?.map((g: any) => g.genre) ?? [],
      externalRating: item.rating ? `${item.rating}/10` : null,
      externalUrl: `https://www.kinopoisk.ru/film/${item.filmId}`,
      director: null,
      author: null,
      developer: null,
    }));
  } catch (e) {
    console.error("Kinopoisk error:", e);
    return [];
  }
}
