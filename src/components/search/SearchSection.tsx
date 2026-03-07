"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SearchResultItem } from "@/types";
import MediaCard from "./MediaCard";
import MediaCardSkeleton from "./MediaCardSkeleton";
import MediaDetailModal from "@/components/modals/MediaDetailModal";
import { cn } from "@/lib/utils";

interface Props {
  initialQuery?: string;
  initialType?: string;
}

const TYPE_OPTIONS = [
  { value: "all", label: "Всё", icon: "🌐" },
  { value: "movie", label: "Фильмы", icon: "🎬" },
  { value: "book", label: "Книги", icon: "📚" },
  { value: "game", label: "Игры", icon: "🎮" },
];

const YEAR_OPTIONS = [
  { value: "", label: "Любой год" },
  { value: "2020s", label: "2020-е" },
  { value: "2010s", label: "2010-е" },
  { value: "2000s", label: "2000-е" },
  { value: "1990s", label: "1990-е" },
  { value: "classic", label: "Классика (до 1990)" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "По релевантности" },
  { value: "year_desc", label: "Сначала новые" },
  { value: "year_asc", label: "Сначала старые" },
  { value: "rating_desc", label: "По рейтингу" },
];

function applyYearFilter(year: number | null, filter: string): boolean {
  if (!filter) return true;
  if (!year) return false;
  if (filter === "2020s") return year >= 2020;
  if (filter === "2010s") return year >= 2010 && year < 2020;
  if (filter === "2000s") return year >= 2000 && year < 2010;
  if (filter === "1990s") return year >= 1990 && year < 2000;
  if (filter === "classic") return year < 1990;
  return true;
}

interface SectionState {
  items: SearchResultItem[];
  page: number;
  hasMore: boolean;
  loadingMore: boolean;
}

export default function SearchSection({ initialQuery, initialType }: Props) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [typeFilter, setTypeFilter] = useState(initialType ?? "all");
  const [yearFilter, setYearFilter] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [movies, setMovies] = useState<SectionState>({ items: [], page: 1, hasMore: false, loadingMore: false });
  const [books, setBooks] = useState<SectionState>({ items: [], page: 1, hasMore: false, loadingMore: false });
  const [games, setGames] = useState<SectionState>({ items: [], page: 1, hasMore: false, loadingMore: false });

  const resetSections = () => {
    setMovies({ items: [], page: 1, hasMore: false, loadingMore: false });
    setBooks({ items: [], page: 1, hasMore: false, loadingMore: false });
    setGames({ items: [], page: 1, hasMore: false, loadingMore: false });
  };

  const search = useCallback(async (q: string, page = 1, append = false) => {
    if (q.length < 2) { resetSections(); setHasSearched(false); return; }
    if (!append) setLoading(true);
    setHasSearched(true);

    const types = typeFilter === "all" ? ["movie", "book", "game"] : [typeFilter];

    await Promise.all(types.map(async (t) => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${t}&page=${page}`);
        const data = await res.json();
        const newItems: SearchResultItem[] = data.results ?? [];
        const hasMore: boolean = data.hasMore ?? false;

        const setter = t === "movie" ? setMovies : t === "book" ? setBooks : setGames;
        setter((prev) => ({
          items: append ? [...prev.items, ...newItems] : newItems,
          page,
          hasMore,
          loadingMore: false,
        }));
      } catch {}
    }));

    setLoading(false);
  }, [typeFilter]);

  useEffect(() => {
    if (initialQuery && initialQuery.length >= 2) search(initialQuery);
  }, [initialQuery, search]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { resetSections(); search(query); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, typeFilter]);

  const loadMore = async (type: "movie" | "book" | "game") => {
    const setter = type === "movie" ? setMovies : type === "book" ? setBooks : setGames;
    const state = type === "movie" ? movies : type === "book" ? books : games;
    setter((prev) => ({ ...prev, loadingMore: true }));
    const nextPage = state.page + 1;
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}&page=${nextPage}`);
      const data = await res.json();
      setter((prev) => ({
        items: [...prev.items, ...(data.results ?? [])],
        page: nextPage,
        hasMore: data.hasMore ?? false,
        loadingMore: false,
      }));
    } catch {
      setter((prev) => ({ ...prev, loadingMore: false }));
    }
  };

  const applySort = (items: SearchResultItem[]) =>
    [...items]
      .filter((r) => applyYearFilter(r.year, yearFilter))
      .sort((a, b) => {
        if (sortBy === "year_desc") return (b.year ?? 0) - (a.year ?? 0);
        if (sortBy === "year_asc") return (a.year ?? 0) - (b.year ?? 0);
        if (sortBy === "rating_desc") return parseFloat(b.externalRating ?? "0") - parseFloat(a.externalRating ?? "0");
        return 0;
      });

  const sections = [
    { key: "movie" as const, label: "Фильмы и Сериалы 🎬", state: movies },
    { key: "book" as const, label: "Книги 📚", state: books },
    { key: "game" as const, label: "Игры 🎮", state: games },
  ].filter((s) => typeFilter === "all" || typeFilter === s.key);

  const handleAddToCollection = (item: SearchResultItem) => {
    [setMovies, setBooks, setGames].forEach((setter) => {
      setter((prev) => ({ ...prev, items: prev.items.map((r) => r.id === item.id ? { ...r, inCollection: true, collectionStatus: "WANT" } : r) }));
    });
    if (selectedItem?.id === item.id) setSelectedItem({ ...item, inCollection: true, collectionStatus: "WANT" });
  };

  const activeFiltersCount = [typeFilter !== "all", yearFilter !== "", sortBy !== "relevance"].filter(Boolean).length;
  const totalResults = sections.reduce((sum, s) => sum + applySort(s.state.items).length, 0);

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск фильмов, книг, игр..."
          className="w-full bg-card/50 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50 font-medium"
          autoFocus />
        {query && (
          <button onClick={() => { setQuery(""); resetSections(); setHasSearched(false); }}
            className="absolute inset-y-0 right-4 flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {TYPE_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setTypeFilter(opt.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                  typeFilter === opt.value
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
                )}>
                <span>{opt.icon}</span>{opt.label}
              </button>
            ))}
          </div>
          <button onClick={() => setFiltersOpen((o) => !o)}
            className={cn(
              "ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm border transition-all",
              filtersOpen || activeFiltersCount > 0
                ? "border-primary/30 text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-primary/20"
            )}>
            ⚙️ Фильтры
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div className="glass rounded-2xl p-4 flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Период</label>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 cursor-pointer">
                {YEAR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Сортировка</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 cursor-pointer">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {activeFiltersCount > 0 && (
              <button onClick={() => { setTypeFilter("all"); setYearFilter(""); setSortBy("relevance"); }}
                className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-2 rounded-xl transition-all">
                Сбросить всё
              </button>
            )}
          </div>
        )}
      </div>

      {!hasSearched && (
        <div className="text-center py-16 space-y-4 text-muted-foreground">
          <div className="text-5xl">🔍</div>
          <p className="text-lg">Введите минимум 2 символа для поиска</p>
          <p className="text-sm opacity-70">Поиск по фильмам, книгам и играм</p>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <MediaCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && hasSearched && totalResults === 0 && (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <div className="text-5xl">😔</div>
          <p className="text-lg">Ничего не найдено</p>
          <p className="text-sm">Попробуйте изменить фильтры или запрос</p>
        </div>
      )}

      {!loading && sections.map((section) => {
        const filtered = applySort(section.state.items);
        if (filtered.length === 0) return null;
        return (
          <div key={section.key} className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground/80">
              {section.label}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((item) => (
                <MediaCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
              ))}
            </div>
            {section.state.hasMore && (
              <div className="flex justify-center pt-2">
                <button onClick={() => loadMore(section.key)} disabled={section.state.loadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-50">
                  {section.state.loadingMore ? (
                    <><div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> Загрузка...</>
                  ) : "Показать ещё"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {selectedItem && (
        <MediaDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onAddToCollection={handleAddToCollection} />
      )}
    </div>
  );
}