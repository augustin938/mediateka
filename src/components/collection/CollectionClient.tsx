"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { CollectionItemWithMedia, CollectionStatus } from "@/types";
import { STATUS_LABELS, STATUS_COLORS, MEDIA_TYPE_ICONS } from "@/types";
import { cn } from "@/lib/utils";

interface CollectionClientProps {
  initialItems: CollectionItemWithMedia[];
}

const STATUS_FILTERS = ["all", "WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const SORT_OPTIONS = [
  { value: "addedAt", label: "По дате добавления" },
  { value: "rating", label: "По оценке" },
  { value: "title", label: "По названию" },
  { value: "year", label: "По году" },
] as const;

const TYPE_FILTERS = [
  { value: "all", label: "Все типы" },
  { value: "movie", label: "🎬 Фильмы" },
  { value: "book", label: "📚 Книги" },
  { value: "game", label: "🎮 Игры" },
] as const;

const SPINE_COLORS = [
  "from-violet-600 to-violet-800",
  "from-blue-600 to-blue-800",
  "from-emerald-600 to-emerald-800",
  "from-amber-600 to-amber-800",
  "from-rose-600 to-rose-800",
  "from-cyan-600 to-cyan-800",
  "from-indigo-600 to-indigo-800",
  "from-teal-600 to-teal-800",
];

function getSpineColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return SPINE_COLORS[Math.abs(hash) % SPINE_COLORS.length];
}

export default function CollectionClient({ initialItems }: CollectionClientProps) {
  const [items, setItems] = useState<CollectionItemWithMedia[]>(initialItems);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"addedAt" | "rating" | "title" | "year">("addedAt");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "shelf">("grid");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number | null>(null);
  const [editReview, setEditReview] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    items.forEach((item) => { item.mediaItem.genres?.forEach((g) => genres.add(g)); });
    return Array.from(genres).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (statusFilter !== "all") result = result.filter((item) => item.status === statusFilter);
    if (typeFilter !== "all") result = result.filter((item) => item.mediaItem.type === typeFilter);
    if (yearFrom) result = result.filter((item) => (item.mediaItem.year ?? 0) >= parseInt(yearFrom));
    if (yearTo) result = result.filter((item) => (item.mediaItem.year ?? 9999) <= parseInt(yearTo));
    if (genreFilter) result = result.filter((item) => item.mediaItem.genres?.some((g) => g.toLowerCase().includes(genreFilter.toLowerCase())));
    result.sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "title") return a.mediaItem.title.localeCompare(b.mediaItem.title, "ru");
      if (sortBy === "year") return (b.mediaItem.year ?? 0) - (a.mediaItem.year ?? 0);
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
    return result;
  }, [items, statusFilter, typeFilter, sortBy, yearFrom, yearTo, genreFilter]);

  const updateStatus = async (id: string, status: CollectionStatus) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, status } : item));
    try {
      const res = await fetch(`/api/collection/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      toast.success("Статус обновлён");
    } catch { setItems(initialItems); toast.error("Ошибка обновления статуса"); }
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/collection/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: editRating, review: editReview || null }) });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, rating: editRating, review: editReview || null } : item));
      toast.success("Сохранено");
      setEditingId(null);
    } catch { toast.error("Ошибка сохранения"); }
  };

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      const res = await fetch(`/api/collection/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Удалено из коллекции");
    } catch { setItems(initialItems); toast.error("Ошибка удаления"); }
  };

  const startEdit = (item: CollectionItemWithMedia) => {
    setEditingId(item.id);
    setEditRating(item.rating ?? null);
    setEditReview(item.review ?? "");
    setSelectedId(null);
  };

  const resetFilters = () => { setStatusFilter("all"); setTypeFilter("all"); setYearFrom(""); setYearTo(""); setGenreFilter(""); };
  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || yearFrom || yearTo || genreFilter;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const status of ["WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"]) c[status] = items.filter((i) => i.status === status).length;
    return c;
  }, [items]);

  const selectedItem = filtered.find((i) => i.id === selectedId);

  if (items.length === 0) {
    return (
      <div className="text-center py-24 space-y-4 text-muted-foreground">
        <div className="text-6xl">📭</div>
        <p className="text-lg font-medium">Коллекция пуста</p>
        <p className="text-sm">Перейдите на <a href="/dashboard" className="text-primary hover:underline">главную страницу</a> и добавьте что-нибудь интересное</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" onClick={() => setSelectedId(null)}>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button key={status} onClick={() => setStatusFilter(status)}
            className={cn("text-sm px-3 py-1.5 rounded-xl border transition-all duration-200 font-medium",
              statusFilter === status
                ? status === "all" ? "bg-primary/20 text-primary border-primary/30" : cn(STATUS_COLORS[status as CollectionStatus])
                : "border-border text-muted-foreground hover:border-primary/30")}>
            {status === "all" ? `Все (${counts.all})` : `${STATUS_LABELS[status as CollectionStatus]} (${counts[status] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-background border border-border rounded-lg px-3 py-2 focus:outline-none text-foreground">
            {TYPE_FILTERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs bg-background border border-border rounded-lg px-3 py-2 focus:outline-none text-foreground">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
            className={cn("text-xs px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5",
              showFilters || hasActiveFilters ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30")}>
            🎛 Фильтры {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all">✕ Сбросить</button>
          )}
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("grid")} title="Сетка"
            className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted")}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </button>
          <button onClick={() => setViewMode("list")} title="Список"
            className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted")}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
          </button>
          <button onClick={() => setViewMode("shelf")} title="Полка"
            className={cn("p-2 transition-colors", viewMode === "shelf" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted")}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="glass rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Жанр</label>
            <input type="text" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}
              placeholder="Например: боевик" list="genres-list"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50" />
            <datalist id="genres-list">{allGenres.map((g) => <option key={g} value={g} />)}</datalist>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Год от</label>
            <input type="number" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="1990"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Год до</label>
            <input type="number" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="2024"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50" />
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">Показано: <span className="text-foreground font-medium">{filtered.length}</span> из {items.length}</p>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <div className="text-4xl">🔍</div>
          <p>Ничего не найдено по выбранным фильтрам</p>
          <button onClick={resetFilters} className="text-primary hover:underline text-sm">Сбросить фильтры</button>
        </div>
      )}

      {/* ─── SHELF VIEW ─────────────────────────────────────────── */}
      {viewMode === "shelf" && filtered.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Нажми на обложку чтобы увидеть детали</p>

          <div className="relative rounded-2xl overflow-visible p-6 pb-0"
            style={{ background: "linear-gradient(180deg, #1e1a2e 0%, #16131f 100%)" }}>

            {Array.from({ length: Math.ceil(filtered.length / 12) }).map((_, rowIdx) => {
              const rowItems = filtered.slice(rowIdx * 12, (rowIdx + 1) * 12);
              return (
                <div key={rowIdx} className="mb-2">
                  <div className="flex items-end gap-1 px-2 min-h-[140px]">
                    {rowItems.map((item) => (
                      <div key={item.id} className="relative flex-shrink-0"
                        style={{ width: item.mediaItem.posterUrl ? 52 : 32 }}>

                        {/* Book */}
                        <div
                          className={cn(
                            "rounded-t-sm overflow-hidden cursor-pointer transition-all duration-200",
                            selectedId === item.id ? "-translate-y-4 shadow-2xl shadow-primary/40 ring-2 ring-primary/50" : "hover:-translate-y-2 hover:shadow-lg"
                          )}
                          style={{ height: item.mediaItem.posterUrl ? 130 : 100 + (item.id.charCodeAt(0) % 30) }}
                          onClick={(e) => { e.stopPropagation(); setSelectedId(selectedId === item.id ? null : item.id); }}
                        >
                          {item.mediaItem.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className={cn("w-full h-full bg-gradient-to-b flex items-center justify-center", getSpineColor(item.id))}>
                              <span className="text-white/90 font-bold text-center px-1 leading-tight"
                                style={{ fontSize: "8px", writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}>
                                {item.mediaItem.title}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shelf plank */}
                  <div className="h-4 rounded-sm shadow-lg"
                    style={{ background: "linear-gradient(180deg, #8B6914 0%, #6B4F10 40%, #4a3508 100%)", boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }} />
                  <div className="h-2 mx-2 rounded-b-sm" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4), transparent)" }} />
                </div>
              );
            })}

            <div className="h-6 -mx-6" style={{ background: "linear-gradient(180deg, #0f0d1a, #0a0812)" }} />
          </div>

          {/* Detail panel — appears below shelf when item selected */}
          {selectedItem && (
            <div className="glass rounded-2xl p-5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-4">
                {/* Poster */}
                <div className="w-20 flex-shrink-0 rounded-xl overflow-hidden bg-muted/30">
                  {selectedItem.mediaItem.posterUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={selectedItem.mediaItem.posterUrl} alt={selectedItem.mediaItem.title} className="w-full h-full object-cover" style={{ aspectRatio: "2/3" }} />
                    : <div className={cn("w-full bg-gradient-to-b flex items-center justify-center p-2 text-center", getSpineColor(selectedItem.id))} style={{ aspectRatio: "2/3" }}>
                        <span className="text-white text-xs font-bold">{selectedItem.mediaItem.title}</span>
                      </div>}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-foreground leading-tight">{selectedItem.mediaItem.title}</h3>
                      {selectedItem.mediaItem.year && <p className="text-sm text-muted-foreground">{selectedItem.mediaItem.year}</p>}
                    </div>
                    <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none flex-shrink-0">✕</button>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <select value={selectedItem.status}
                      onChange={(e) => updateStatus(selectedItem.id, e.target.value as CollectionStatus)}
                      className={cn("text-xs rounded-lg border px-2 py-1.5 bg-background focus:outline-none", STATUS_COLORS[selectedItem.status])}>
                      {(["WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const).map((s) => (
                        <option key={s} value={s} className="bg-background text-foreground">{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    {selectedItem.rating && <span className="text-sm font-bold text-amber-400">★ {selectedItem.rating}/10</span>}
                    {selectedItem.mediaItem.genres && selectedItem.mediaItem.genres.length > 0 && (
                      <span className="text-xs text-muted-foreground">{selectedItem.mediaItem.genres.slice(0, 3).join(", ")}</span>
                    )}
                  </div>

                  {selectedItem.review && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{selectedItem.review}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => startEdit(selectedItem)}
                      className="text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-1.5 rounded-lg transition-colors">
                      ✏️ Редактировать
                    </button>
                    <button onClick={() => removeItem(selectedItem.id)}
                      className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                      🗑 Удалить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── GRID VIEW ──────────────────────────────────────────── */}
      {viewMode === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="glass rounded-xl overflow-hidden group">
              <div className="aspect-[2/3] bg-muted/50 relative overflow-hidden">
                {item.mediaItem.posterUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</div>}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-2">
                  <button onClick={() => startEdit(item)} className="text-xs bg-primary/80 hover:bg-primary text-white px-3 py-1.5 rounded-lg w-full">✏️ Редактировать</button>
                  <button onClick={() => removeItem(item.id)} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg w-full">🗑 Удалить</button>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-xs font-semibold font-display leading-tight line-clamp-2 text-foreground">{item.mediaItem.title}</p>
                {item.mediaItem.year && <p className="text-xs text-muted-foreground">{item.mediaItem.year}</p>}
                <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value as CollectionStatus)}
                  className={cn("w-full text-xs rounded-lg border px-2 py-1.5 bg-background focus:outline-none", STATUS_COLORS[item.status])}>
                  {(["WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const).map((s) => (
                    <option key={s} value={s} className="bg-background text-foreground">{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                {item.rating && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={cn("flex-1 h-1 rounded-full", i < item.rating! ? "bg-amber-400" : "bg-muted/50")} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── LIST VIEW ──────────────────────────────────────────── */}
      {viewMode === "list" && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="glass rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted/50">
                {item.mediaItem.posterUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-xl">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold font-display text-sm truncate text-foreground">{item.mediaItem.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {item.mediaItem.year && <span className="text-xs text-muted-foreground">{item.mediaItem.year}</span>}
                  <span className="text-xs text-muted-foreground">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</span>
                  {item.mediaItem.genres && item.mediaItem.genres.length > 0 && (
                    <span className="text-xs text-muted-foreground">{item.mediaItem.genres.slice(0, 2).join(", ")}</span>
                  )}
                </div>
                {item.review && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.review}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {item.rating && <span className="text-sm font-bold text-amber-400">★ {item.rating}</span>}
                <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value as CollectionStatus)}
                  className={cn("text-xs rounded-lg border px-2 py-1.5 bg-background focus:outline-none", STATUS_COLORS[item.status])}>
                  {(["WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const).map((s) => (
                    <option key={s} value={s} className="bg-background text-foreground">{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setEditingId(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingId(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-foreground">Оценка и отзыв</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Оценка (1-10)</label>
              <div className="flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <button key={i} onClick={() => setEditRating(i + 1)}
                    className={cn("flex-1 h-8 rounded-md transition-all text-xs font-bold border",
                      editRating !== null && i < editRating
                        ? "bg-amber-500/30 border-amber-500/50 text-amber-400"
                        : "bg-muted/30 border-border text-muted-foreground hover:border-amber-500/30")}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Отзыв (опционально)</label>
              <textarea value={editReview} onChange={(e) => setEditReview(e.target.value)}
                placeholder="Ваши впечатления..." rows={4} maxLength={2000}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-muted-foreground/50" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingId(null)} className="flex-1 border border-border hover:bg-muted py-2.5 rounded-xl text-sm font-medium text-foreground transition-colors">Отмена</button>
              <button onClick={() => saveEdit(editingId)} className="flex-1 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}