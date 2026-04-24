import type { MediaItem } from "@/lib/db/schema";

const OL_BASE = "https://openlibrary.org";

interface OLSearchDoc {
  key: string; // "/works/OL123W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  ratings_average?: number;
  description?: string;
}

interface OLSearchResult {
  docs: OLSearchDoc[];
  numFound: number;
}

// Публичная функция searchOpenLibrary для внешнего использования модуля.
export async function searchOpenLibrary(
  query: string
): Promise<Omit<MediaItem, "createdAt" | "updatedAt">[]> {
  const url = `${OL_BASE}/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,first_publish_year,cover_i,subject,ratings_average&limit=10`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data: OLSearchResult = await res.json();

  return data.docs.slice(0, 10).map((doc) => {
    const workId = doc.key.replace("/works/", "");

    return {
      id: `ol_${workId}`,
      externalId: workId,
      type: "book" as const,
      title: doc.title,
      originalTitle: null,
      description: null,
      posterUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : null,
      year: doc.first_publish_year ?? null,
      genres: doc.subject?.slice(0, 5) ?? [],
      externalRating: doc.ratings_average
        ? `${doc.ratings_average.toFixed(1)}/5`
        : null,
      externalUrl: `https://openlibrary.org${doc.key}`,
      director: null,
      author: doc.author_name?.[0] ?? null,
      developer: null,
    };
  });
}

// Публичная функция getOpenLibraryDetails для внешнего использования модуля.
export async function getOpenLibraryDetails(
  workId: string
): Promise<Partial<MediaItem> | null> {
  const url = `${OL_BASE}/works/${workId}.json`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;

  const data = await res.json();

  let description: string | null = null;
  if (typeof data.description === "string") {
    description = data.description;
  } else if (data.description?.value) {
    description = data.description.value;
  }

  return {
    description,
    genres: data.subjects?.slice(0, 5) ?? [],
  };
}
