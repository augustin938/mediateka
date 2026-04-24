"use client";

const RECENT_SEARCHES_KEY = "mediateka-recent-searches";
const RECENT_SEARCHES_MAX = 8;

export function readRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, RECENT_SEARCHES_MAX);
  } catch {
    return [];
  }
}

export function pushRecentSearch(prev: string[], query: string) {
  const cleaned = query.trim();
  if (cleaned.length < 2) return prev;
  const next = [cleaned, ...prev.filter((x) => x !== cleaned)].slice(0, RECENT_SEARCHES_MAX);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
