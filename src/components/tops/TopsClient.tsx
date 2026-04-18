"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MediaDetailModal from "@/components/modals/MediaDetailModal";
import type { SearchResultItem } from "@/types";

interface TopItem {
  rank: number;
  id: string;
  externalId: string;
  title: string;
  originalTitle: string | null;
  year: number | null;
  posterUrl: string | null;
  rating: string | null;
  type: "movie" | "book" | "game";
  externalUrl: string | null;
  genres: string[];
  author?: string | null;
}

const TABS = [
  { key: "movies", label: "Фильмы", icon: "🎬" },
  { key: "series", label: "Сериалы", icon: "📺" },
  { key: "games", label: "Игры", icon: "🎮" },
  { key: "books", label: "Книги", icon: "📚" },
];

const RANK_COLORS = ["text-amber-400", "text-slate-300", "text-amber-600"];
const RANK_BG = ["bg-amber-400/10", "bg-slate-300/10", "bg-amber-600/10"];

export default function TopsClient() {
  const [activeTab, setActiveTab] = useState("movies");
  const [items, setItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set());

  // Загружаем id элементов коллекции, чтобы помечать уже добавленные карточки.
  useEffect(() => {
    fetch("/api/collection")
      .then((r) => r.json())
      .then((data) => {
        const ids = new Set<string>((data.items ?? []).map((i: any) => i.mediaItem?.id));
        setCollectionIds(ids);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotalPages(1);
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tops?type=${activeTab}&page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setItems((prev) => {
            const newItems = page === 1 ? data.items ?? [] : [...prev, ...(data.items ?? [])];
            const seen = new Set<string>();
            return newItems.filter((item: TopItem) => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
            });
            });
        setTotalPages(data.totalPages ?? 1);
      })
      .catch(() => toast.error("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [activeTab, page]);

  const handleCardClick = (item: TopItem) => {
    setSelectedItem({
      id: item.id,
      externalId: item.externalId,
      title: item.title,
      originalTitle: item.originalTitle,
      type: item.type,
      year: item.year,
      posterUrl: item.posterUrl,
      externalRating: item.rating,
      externalUrl: item.externalUrl,
      genres: item.genres,
      description: null,
      director: null,
      author: item.author ?? null,
      developer: null,
      inCollection: collectionIds.has(item.id),
    } as SearchResultItem);
  };

  const handleAddToCollection = (item: SearchResultItem) => {
    setCollectionIds((prev) => new Set([...prev, item.id]));
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border",
              activeTab === tab.key
                ? "bg-primary/15 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
            )}>
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
            <div key={`${item.id}_${index}`}
            onClick={() => handleCardClick(item)}
            className="glass rounded-2xl p-3 flex items-center gap-4 hover:border-primary/20 cursor-pointer transition-all group">

            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm flex-shrink-0",
              item.rank <= 3 ? RANK_BG[item.rank - 1] : "bg-muted/30"
            )}>
              <span className={item.rank <= 3 ? RANK_COLORS[item.rank - 1] : "text-muted-foreground"}>
                {item.rank <= 3 ? ["🥇", "🥈", "🥉"][item.rank - 1] : item.rank}
              </span>
            </div>

            <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0">
              {item.posterUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="w-full h-full flex items-center justify-center text-lg">
                    {TABS.find((t) => t.key === activeTab)?.icon}
                  </div>}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {item.originalTitle && item.originalTitle !== item.title && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.originalTitle}</span>
                )}
                {item.author && (
                  <span className="text-xs text-muted-foreground">{item.author}</span>
                )}
                {item.year && <span className="text-xs text-muted-foreground">{item.year}</span>}
                {item.genres.slice(0, 2).map((g) => (
                  <span key={g} className="text-xs bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-md">{g}</span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {item.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-amber-400 text-sm">★</span>
                  <span className="text-sm font-semibold text-foreground">{item.rating}</span>
                </div>
              )}
              {collectionIds.has(item.id) && (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <span className="text-emerald-400 text-xs">✓</span>
                </div>
              )}
              <span className="text-muted-foreground text-xs group-hover:text-primary transition-colors">→</span>
            </div>
          </div>
        ))}

        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl p-3 flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex-shrink-0" />
            <div className="w-10 h-14 rounded-lg bg-muted/50 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted/50 rounded w-2/3" />
              <div className="h-3 bg-muted/50 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>

      {!loading && page < totalPages && (
        <div className="flex justify-center pt-2">
          <button onClick={() => setPage((p) => p + 1)}
            className="px-6 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
            Загрузить ещё
          </button>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">😔</div>
          <p>Не удалось загрузить топ</p>
        </div>
      )}

      {selectedItem && (
        <MediaDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCollection={handleAddToCollection}
        />
      )}
    </div>
  );
}