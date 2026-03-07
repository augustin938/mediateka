"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { MEDIA_TYPE_ICONS } from "@/types";
import { cn } from "@/lib/utils";

interface Recommendation {
  title: string;
  type: "movie" | "book" | "game";
  year: number | null;
  genres: string[];
  reason: string;
  posterUrl?: string | null;
  externalUrl?: string;
  externalId?: string;
}

const TYPE_LABELS = {
  all: "Все",
  movie: "🎬 Фильмы",
  book: "📚 Книги",
  game: "🎮 Игры",
};

const STATUS_OPTIONS: Record<string, { value: string; label: string; color: string }[]> = {
  movie: [
    { value: "WANT",        label: "🔖 Хочу посмотреть",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" },
    { value: "IN_PROGRESS", label: "▶️ Смотрю",            color: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30" },
    { value: "COMPLETED",   label: "✅ Посмотрел",         color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" },
  ],
  book: [
    { value: "WANT",        label: "🔖 Хочу прочитать",   color: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" },
    { value: "IN_PROGRESS", label: "📖 Читаю",             color: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30" },
    { value: "COMPLETED",   label: "✅ Прочитал",          color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" },
  ],
  game: [
    { value: "WANT",        label: "🔖 Хочу поиграть",    color: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" },
    { value: "IN_PROGRESS", label: "🎮 Играю",             color: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30" },
    { value: "COMPLETED",   label: "✅ Прошёл",            color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" },
  ],
};

function dedupeRecs(recs: Recommendation[]): Recommendation[] {
  const seen = new Set<string>();
  return recs.filter((r) => {
    const key = `${r.type}_${r.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function RecommendationsClient() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "book" | "game">("all");
  const [seed, setSeed] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    setRecs([]);
    setAddingId(null);

    // Load collection IDs to filter out already-added items
    Promise.all([
      fetch(`/api/recommendations?seed=${seed}`).then((r) => r.json()),
      fetch("/api/collection").then((r) => r.json()),
    ]).then(([recsData, collectionData]) => {
      if (recsData.reason === "empty") {
        setEmpty(true);
        return;
      }
      setEmpty(false);

      // Build set of titles already in collection
      const inCollection = new Set<string>(
        (collectionData.items ?? []).map((item: any) =>
          `${item.mediaItem.type}_${item.mediaItem.title.toLowerCase().trim()}`
        )
      );
      setAddedIds(inCollection);

      // Dedupe and filter out already-in-collection
      const deduped = dedupeRecs(recsData.recommendations ?? []);
      const filtered = deduped.filter(
        (r) => !inCollection.has(`${r.type}_${r.title.toLowerCase().trim()}`)
      );
      setRecs(filtered);
    }).finally(() => setLoading(false));
  }, [seed]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => { setAddingId(null); setSeed((s) => s + 1); };

  const addToCollection = async (rec: Recommendation, status: string, cardId: string) => {
    setSavingId(cardId);
    try {
      const mediaItemId = `rec_${rec.type}_${rec.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_").toLowerCase().slice(0, 40)}`;
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaItemId,
          status,
          externalId: rec.externalId ?? mediaItemId,
          type: rec.type,
          title: rec.title,
          posterUrl: rec.posterUrl ?? null,
          year: rec.year ?? null,
          genres: rec.genres ?? [],
          externalUrl: rec.externalUrl ?? null,
          description: null,
          originalTitle: null,
          externalRating: null,
          director: null,
          author: null,
          developer: null,
        }),
      });

      if (res.status === 409) {
        toast.info("Уже есть в коллекции");
      } else if (res.ok) {
        toast.success(`«${rec.title}» добавлен в коллекцию!`);
        setAddingId(null);
        // Remove from recs list
        setRecs((prev) => prev.filter((r) => `${r.type}_${r.title}` !== `${rec.type}_${rec.title}`));
      } else {
        toast.error("Ошибка добавления");
      }
    } catch {
      toast.error("Ошибка добавления");
    } finally {
      setSavingId(null);
    }
  };

  const filtered = typeFilter === "all" ? recs : recs.filter((r) => r.type === typeFilter);
  const counts = {
    all: recs.length,
    movie: recs.filter((r) => r.type === "movie").length,
    book: recs.filter((r) => r.type === "book").length,
    game: recs.filter((r) => r.type === "game").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {[80, 100, 90, 80].map((w, i) => (
            <div key={i} className="skeleton rounded-xl h-8" style={{ width: w }} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl overflow-hidden">
              <div className="aspect-video skeleton" />
              <div className="p-5 space-y-3">
                <div className="h-5 skeleton rounded-md w-3/4" />
                <div className="h-3 skeleton rounded-md w-1/2" />
                <div className="h-10 skeleton rounded-md w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm">Подбираем рекомендации...</p>
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="text-center py-24 space-y-4 text-muted-foreground">
        <div className="text-6xl">🎯</div>
        <p className="text-lg font-medium text-foreground">Пока нет данных для рекомендаций</p>
        <p className="text-sm max-w-sm mx-auto">
          Добавь несколько завершённых фильмов, книг или игр — и мы подберём что-нибудь интересное
        </p>
        <a href="/dashboard" className="inline-flex items-center gap-1 text-sm bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/30 transition-colors">
          Найти что-нибудь →
        </a>
      </div>
    );
  }

  if (recs.length === 0) {
    return (
      <div className="text-center py-24 space-y-4 text-muted-foreground">
        <div className="text-6xl">🎉</div>
        <p className="text-lg font-medium text-foreground">Все рекомендации добавлены!</p>
        <p className="text-sm">Обнови чтобы получить новые</p>
        <button onClick={handleRefresh}
          className="inline-flex items-center gap-2 text-sm bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/30 transition-colors">
          🔄 Обновить рекомендации
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" onClick={() => setAddingId(null)}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(["all", "movie", "book", "game"] as const).map((type) => (
            <button key={type} onClick={() => setTypeFilter(type)}
              className={cn("text-sm px-3 py-1.5 rounded-xl border transition-all duration-200 font-medium",
                typeFilter === type
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "border-border text-muted-foreground hover:border-primary/30")}>
              {TYPE_LABELS[type]}
              {counts[type] > 0 && (
                <span className={cn("ml-1.5 text-xs", typeFilter === type ? "text-primary/70" : "text-muted-foreground/60")}>
                  {counts[type]}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={handleRefresh}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 px-4 py-2 rounded-xl transition-all group">
          <span className="group-hover:rotate-180 transition-transform duration-500 inline-block">🔄</span>
          Обновить
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <div className="text-4xl">{MEDIA_TYPE_ICONS[typeFilter as "movie" | "book" | "game"] ?? "🔍"}</div>
          <p>Нет рекомендаций по этому типу</p>
          <button onClick={() => setTypeFilter("all")} className="text-primary hover:underline text-sm">Показать все</button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((rec, i) => {
          // Use index as part of cardId to make each card unique even with same title
          const cardId = `${rec.type}_${rec.title}_${i}`;
          const isAdding = addingId === cardId;
          const isSaving = savingId === cardId;
          const statusOpts = STATUS_OPTIONS[rec.type] ?? STATUS_OPTIONS.movie;

          return (
            <div key={cardId} onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 flex flex-col group">

              {/* Poster */}
              <div className="aspect-video bg-muted/30 overflow-hidden relative">
                {rec.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rec.posterUrl} alt={rec.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-primary/10 to-primary/5">
                    {MEDIA_TYPE_ICONS[rec.type]}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-white flex items-center gap-1.5">
                  <span>{MEDIA_TYPE_ICONS[rec.type]}</span>
                  <span>{rec.type === "movie" ? "Фильм" : rec.type === "book" ? "Книга" : "Игра"}</span>
                </div>
                {rec.year && (
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-white">
                    {rec.year}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <h3 className="font-display font-bold text-foreground leading-tight text-base">{rec.title}</h3>

                {rec.genres && rec.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {rec.genres.slice(0, 3).map((g) => (
                      <span key={g} className="text-xs bg-primary/10 text-primary/80 border border-primary/20 px-2 py-0.5 rounded-md">{g}</span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 items-start flex-1">
                  <span className="text-primary text-sm flex-shrink-0 mt-0.5">✦</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{rec.reason}</p>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  {isAdding ? (
                    <div className="space-y-1.5 animate-fade-in">
                      <p className="text-xs text-muted-foreground font-medium">Добавить со статусом:</p>
                      {statusOpts.map((opt) => (
                        <button key={opt.value}
                          onClick={() => addToCollection(rec, opt.value, cardId)}
                          disabled={isSaving}
                          className={cn("w-full text-xs px-3 py-2 rounded-lg border transition-all font-medium", opt.color,
                            isSaving && "opacity-50 cursor-not-allowed")}>
                          {isSaving ? "Добавляем..." : opt.label}
                        </button>
                      ))}
                      <button onClick={() => setAddingId(null)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAddingId(cardId)}
                        className="flex-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5">
                        ➕ В коллекцию
                      </button>
                      {rec.externalUrl && (
                        <a href={rec.externalUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 px-3 py-2 rounded-lg transition-colors">
                          ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}