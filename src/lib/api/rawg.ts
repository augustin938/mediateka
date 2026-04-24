import type { MediaItem } from "@/lib/db/schema";

const RAWG_BASE = "https://api.rawg.io/api";
const API_KEY = process.env.RAWG_API_KEY;

interface RAWGGame {
  id: number;
  name: string;
  released: string | null;
  background_image: string | null;
  rating: number;
  genres: { id: number; name: string }[];
  developers?: { id: number; name: string }[];
  description_raw?: string;
}

interface RAWGSearchResult {
  results: RAWGGame[];
  count: number;
}

// Публичная функция searchRAWG для внешнего использования модуля.
export async function searchRAWG(
  query: string
): Promise<Omit<MediaItem, "createdAt" | "updatedAt">[]> {
  if (!API_KEY) {
    console.warn("RAWG_API_KEY not set");
    return [];
  }

  const url = `${RAWG_BASE}/games?key=${API_KEY}&search=${encodeURIComponent(query)}&page_size=10&ordering=-rating`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data: RAWGSearchResult = await res.json();

  return data.results.slice(0, 10).map((game) => ({
    id: `rawg_${game.id}`,
    externalId: String(game.id),
    type: "game" as const,
    title: game.name,
    originalTitle: null,
    description: game.description_raw ?? null,
    posterUrl: game.background_image,
    year: game.released ? new Date(game.released).getFullYear() : null,
    genres: game.genres?.map((g) => g.name) ?? [],
    externalRating: game.rating ? `${game.rating.toFixed(1)}/5` : null,
    externalUrl: `https://rawg.io/games/${game.id}`,
    director: null,
    author: null,
    developer: game.developers?.[0]?.name ?? null,
  }));
}

// Публичная функция getRAWGDetails для внешнего использования модуля.
export async function getRAWGDetails(
  gameId: string
): Promise<Partial<MediaItem> | null> {
  if (!API_KEY) return null;

  const url = `${RAWG_BASE}/games/${gameId}?key=${API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;

  const data: RAWGGame & {
    developers: { name: string }[];
    publishers: { name: string }[];
  } = await res.json();

  return {
    description: data.description_raw ?? null,
    genres: data.genres?.map((g) => g.name) ?? [],
    developer: data.developers?.[0]?.name ?? null,
  };
}
