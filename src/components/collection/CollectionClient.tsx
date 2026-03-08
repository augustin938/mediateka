"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import type { CollectionItemWithMedia, CollectionStatus } from "@/types";
import { STATUS_LABELS, STATUS_COLORS, MEDIA_TYPE_ICONS } from "@/types";
import { cn } from "@/lib/utils";

interface Tag { id: string; name: string; color: string; }
interface CollectionClientProps { initialItems: CollectionItemWithMedia[]; }

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
  "from-violet-600 to-violet-800", "from-blue-600 to-blue-800",
  "from-emerald-600 to-emerald-800", "from-amber-600 to-amber-800",
  "from-rose-600 to-rose-800", "from-cyan-600 to-cyan-800",
  "from-indigo-600 to-indigo-800", "from-teal-600 to-teal-800",
];

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

const STATUS_BAR_COLORS: Record<CollectionStatus, string> = {
  WANT: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  COMPLETED: "bg-emerald-500",
  DROPPED: "bg-red-500",
};

function getSpineColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return SPINE_COLORS[Math.abs(hash) % SPINE_COLORS.length];
}

function StarRating({ rating, max = 10 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} className={cn("w-2.5 h-2.5", i < rating ? "text-amber-400" : "text-muted/40")} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-[10px] text-amber-400 font-bold ml-1">{rating}/10</span>
    </div>
  );
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
  const [editTab, setEditTab] = useState<"main" | "tags">("main");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<CollectionItemWithMedia | null>(null);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [itemTags, setItemTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then((d) => setAllTags(d.tags ?? []));
  }, []);

  useEffect(() => {
    if (!editingId) return;
    const item = items.find((i) => i.id === editingId);
    setItemTags((item as any)?.tags ?? []);
  }, [editingId, items]);

  const deleteTag = async (tagId: string) => {
    await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
    setAllTags((prev) => prev.filter((t) => t.id !== tagId));
    setItemTags((prev) => prev.filter((t) => t.id !== tagId));
    setItems((prev) => prev.map((item) => ({ ...item, tags: ((item as any).tags ?? []).filter((t: any) => t.id !== tagId) })));
  };

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    items.forEach((item) => { item.mediaItem.genres?.forEach((g) => genres.add(g)); });
    return Array.from(genres).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.mediaItem.title.toLowerCase().includes(q) ||
        item.mediaItem.originalTitle?.toLowerCase().includes(q) ||
        item.mediaItem.author?.toLowerCase().includes(q) ||
        item.mediaItem.director?.toLowerCase().includes(q) ||
        item.mediaItem.developer?.toLowerCase().includes(q) ||
        item.review?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") result = result.filter((item) => item.status === statusFilter);
    if (typeFilter !== "all") result = result.filter((item) => item.mediaItem.type === typeFilter);
    if (yearFrom) result = result.filter((item) => (item.mediaItem.year ?? 0) >= parseInt(yearFrom));
    if (yearTo) result = result.filter((item) => (item.mediaItem.year ?? 9999) <= parseInt(yearTo));
    if (genreFilter) result = result.filter((item) => item.mediaItem.genres?.some((g) => g.toLowerCase().includes(genreFilter.toLowerCase())));
    if (tagFilter) result = result.filter((item) => ((item as any).tags ?? []).some((t: Tag) => t.id === tagFilter));
    result.sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "title") return a.mediaItem.title.localeCompare(b.mediaItem.title, "ru");
      if (sortBy === "year") return (b.mediaItem.year ?? 0) - (a.mediaItem.year ?? 0);
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
    return result;
  }, [items, statusFilter, typeFilter, sortBy, yearFrom, yearTo, genreFilter, searchQuery, tagFilter]);

  const updateStatus = async (id: string, status: CollectionStatus) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, status } : item));
    if (detailItem?.id === id) setDetailItem((prev) => prev ? { ...prev, status } : null);
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
    setDetailItem(null);
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
    setEditTab("main");
    setDetailItem(null);
  };

  const handleToggleTag = async (tag: Tag) => {
    if (!editingId) return;
    const hasTag = itemTags.some((t) => t.id === tag.id);
    if (hasTag) {
      await fetch(`/api/collection/${editingId}/tags`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagId: tag.id }) });
      setItemTags((prev) => prev.filter((t) => t.id !== tag.id));
      setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, tags: ((i as any).tags ?? []).filter((t: any) => t.id !== tag.id) } : i));
    } else {
      await fetch(`/api/collection/${editingId}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagId: tag.id }) });
      setItemTags((prev) => [...prev, tag]);
      setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, tags: [...((i as any).tags ?? []), tag] } : i));
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }) });
    if (res.status === 409) { toast.error("Тег уже существует"); return; }
    const data = await res.json();
    setAllTags((prev) => [...prev, data.tag]);
    setNewTagName("");
    setShowTagInput(false);
    if (editingId) {
      await fetch(`/api/collection/${editingId}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagId: data.tag.id }) });
      setItemTags((prev) => [...prev, data.tag]);
    }
  };

  const resetFilters = () => { setStatusFilter("all"); setTypeFilter("all"); setYearFrom(""); setYearTo(""); setGenreFilter(""); setTagFilter(null); setSearchQuery(""); };
  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || yearFrom || yearTo || genreFilter || tagFilter || searchQuery.trim();

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
      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по коллекции..."
          className="w-full bg-card/50 border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50" />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

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

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground">🏷 Теги:</span>
          {allTags.map((tag) => (
            <button key={tag.id} onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
              className={cn("text-xs px-2.5 py-1 rounded-full border transition-all",
                tagFilter === tag.id ? "text-white border-transparent" : "text-muted-foreground border-border hover:border-primary/30")}
              style={tagFilter === tag.id ? { backgroundColor: tag.color } : {}}>
              {tag.name}
            </button>
          ))}
        </div>
      )}

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
          {[
            { mode: "grid", icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
            { mode: "list", icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg> },
            { mode: "shelf", icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg> },
          ].map(({ mode, icon }) => (
            <button key={mode} onClick={() => setViewMode(mode as any)}
              className={cn("p-2 transition-colors", viewMode === mode ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted")}>
              {icon}
            </button>
          ))}
        </div>
      </div>

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

      {/* ─── SHELF VIEW ─── */}
      {viewMode === "shelf" && filtered.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Нажми на обложку чтобы увидеть детали</p>
          <div className="relative rounded-2xl overflow-visible p-6 pb-0" style={{ background: "linear-gradient(180deg, #1e1a2e 0%, #16131f 100%)" }}>
            {Array.from({ length: Math.ceil(filtered.length / 12) }).map((_, rowIdx) => {
              const rowItems = filtered.slice(rowIdx * 12, (rowIdx + 1) * 12);
              return (
                <div key={rowIdx} className="mb-2">
                  <div className="flex items-end gap-1 px-2 min-h-[140px]">
                    {rowItems.map((item) => (
                      <div key={item.id} className="relative flex-shrink-0" style={{ width: item.mediaItem.posterUrl ? 52 : 32 }}>
                        <div className={cn("rounded-t-sm overflow-hidden cursor-pointer transition-all duration-200",
                          selectedId === item.id ? "-translate-y-4 shadow-2xl shadow-primary/40 ring-2 ring-primary/50" : "hover:-translate-y-2 hover:shadow-lg")}
                          style={{ height: item.mediaItem.posterUrl ? 130 : 100 + (item.id.charCodeAt(0) % 30) }}
                          onClick={(e) => { e.stopPropagation(); setSelectedId(selectedId === item.id ? null : item.id); }}>
                          {item.mediaItem.posterUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover" />
                            : <div className={cn("w-full h-full bg-gradient-to-b flex items-center justify-center", getSpineColor(item.id))}>
                                <span className="text-white/90 font-bold text-center px-1 leading-tight"
                                  style={{ fontSize: "8px", writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}>
                                  {item.mediaItem.title}
                                </span>
                              </div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-4 rounded-sm shadow-lg" style={{ background: "linear-gradient(180deg, #8B6914 0%, #6B4F10 40%, #4a3508 100%)", boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }} />
                  <div className="h-2 mx-2 rounded-b-sm" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4), transparent)" }} />
                </div>
              );
            })}
            <div className="h-6 -mx-6" style={{ background: "linear-gradient(180deg, #0f0d1a, #0a0812)" }} />
          </div>
          {selectedItem && (
            <div className="glass rounded-2xl p-5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-4">
                <div className="w-20 flex-shrink-0 rounded-xl overflow-hidden bg-muted/30">
                  {selectedItem.mediaItem.posterUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={selectedItem.mediaItem.posterUrl} alt={selectedItem.mediaItem.title} className="w-full h-full object-cover" style={{ aspectRatio: "2/3" }} />
                    : <div className={cn("w-full bg-gradient-to-b flex items-center justify-center p-2 text-center", getSpineColor(selectedItem.id))} style={{ aspectRatio: "2/3" }}>
                        <span className="text-white text-xs font-bold">{selectedItem.mediaItem.title}</span>
                      </div>}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-foreground leading-tight">{selectedItem.mediaItem.title}</h3>
                      {selectedItem.mediaItem.year && <p className="text-sm text-muted-foreground">{selectedItem.mediaItem.year}</p>}
                    </div>
                    <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none flex-shrink-0">✕</button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <select value={selectedItem.status} onChange={(e) => updateStatus(selectedItem.id, e.target.value as CollectionStatus)}
                      className={cn("text-xs rounded-lg border px-2 py-1.5 bg-background focus:outline-none", STATUS_COLORS[selectedItem.status])}>
                      {(["WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const).map((s) => (
                        <option key={s} value={s} className="bg-background text-foreground">{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    {selectedItem.rating && <span className="text-sm font-bold text-amber-400">★ {selectedItem.rating}/10</span>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => startEdit(selectedItem)} className="text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-1.5 rounded-lg transition-colors">✏️ Редактировать</button>
                    <button onClick={() => removeItem(selectedItem.id)} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors">🗑 Удалить</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── GRID VIEW ─── */}
      {viewMode === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div key={item.id}
              className="glass rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
              onClick={() => setDetailItem(item)}>
              {/* Status bar top */}
              <div className={cn("h-1 w-full", STATUS_BAR_COLORS[item.status])} />

              <div className="aspect-[2/3] bg-muted/50 relative overflow-hidden">
                {item.mediaItem.posterUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  : <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/30">
                      <span className="text-4xl">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</span>
                      <p className="text-xs text-muted-foreground text-center px-2 leading-tight line-clamp-3">{item.mediaItem.title}</p>
                    </div>}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-3 gap-2">
                  {item.rating && <StarRating rating={item.rating} />}
                  <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{item.mediaItem.title}</p>
                  {item.mediaItem.genres && item.mediaItem.genres.length > 0 && (
                    <p className="text-white/60 text-[10px]">{item.mediaItem.genres.slice(0, 2).join(" · ")}</p>
                  )}
                  <div className="flex gap-1.5 mt-1">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                      className="flex-1 text-[11px] bg-white/20 hover:bg-white/30 text-white py-1.5 rounded-lg backdrop-blur-sm transition-colors font-medium">
                      ✏️ Изменить
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="text-[11px] bg-red-500/30 hover:bg-red-500/50 text-white py-1.5 px-2 rounded-lg backdrop-blur-sm transition-colors">
                      🗑
                    </button>
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div className="p-2.5 space-y-1.5">
                <p className="text-xs font-semibold font-display leading-tight line-clamp-1 text-foreground">{item.mediaItem.title}</p>
                <div className="flex items-center justify-between gap-1">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", STATUS_COLORS[item.status])}>
                    {STATUS_LABELS[item.status]}
                  </span>
                  {item.mediaItem.year && <span className="text-[10px] text-muted-foreground">{item.mediaItem.year}</span>}
                </div>
                {item.rating && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={cn("flex-1 h-0.5 rounded-full", i < item.rating! ? "bg-amber-400" : "bg-muted/40")} />
                    ))}
                  </div>
                )}
                {(item as any).tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {((item as any).tags as Tag[]).slice(0, 2).map((tag) => (
                      <span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── LIST VIEW ─── */}
      {viewMode === "list" && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id}
              className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-card/80 transition-colors cursor-pointer group"
              onClick={() => setDetailItem(item)}>
              {/* Status bar left */}
              <div className={cn("w-1 self-stretch rounded-full flex-shrink-0", STATUS_BAR_COLORS[item.status])} />

              <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted/50 relative">
                {item.mediaItem.posterUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-xl">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</div>}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start gap-2">
                  <p className="font-semibold font-display text-sm truncate text-foreground flex-1">{item.mediaItem.title}</p>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0", STATUS_COLORS[item.status])}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {item.mediaItem.year && <span className="text-xs text-muted-foreground">{item.mediaItem.year}</span>}
                  <span className="text-xs text-muted-foreground">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</span>
                  {item.mediaItem.genres && item.mediaItem.genres.length > 0 && (
                    <span className="text-xs text-muted-foreground">{item.mediaItem.genres.slice(0, 2).join(", ")}</span>
                  )}
                  {item.rating && <StarRating rating={item.rating} />}
                </div>
                {item.review && <p className="text-xs text-muted-foreground line-clamp-1 italic">"{item.review}"</p>}
                {(item as any).tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {((item as any).tags as Tag[]).slice(0, 3).map((tag) => (
                      <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                  className="p-2 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── DETAIL MODAL (click on card) ─── */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetailItem(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative glass rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {/* Hero poster */}
            <div className="relative h-48 bg-muted/30 overflow-hidden">
              {detailItem.mediaItem.posterUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={detailItem.mediaItem.posterUrl} alt={detailItem.mediaItem.title} className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
                : <div className="w-full h-full flex items-center justify-center text-6xl">{MEDIA_TYPE_ICONS[detailItem.mediaItem.type]}</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button onClick={() => setDetailItem(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">✕</button>
              <div className={cn("absolute bottom-0 left-0 right-0 h-1", STATUS_BAR_COLORS[detailItem.status])} />
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-xl text-foreground leading-tight">{detailItem.mediaItem.title}</h2>
                  {detailItem.mediaItem.originalTitle && detailItem.mediaItem.originalTitle !== detailItem.mediaItem.title && (
                    <p className="text-sm text-muted-foreground">{detailItem.mediaItem.originalTitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {detailItem.mediaItem.year && <span className="text-sm text-muted-foreground">{detailItem.mediaItem.year}</span>}
                    {detailItem.mediaItem.director && <span className="text-sm text-muted-foreground">· {detailItem.mediaItem.director}</span>}
                    {detailItem.mediaItem.author && <span className="text-sm text-muted-foreground">· {detailItem.mediaItem.author}</span>}
                    {detailItem.mediaItem.developer && <span className="text-sm text-muted-foreground">· {detailItem.mediaItem.developer}</span>}
                  </div>
                </div>
                {detailItem.rating && (
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex flex-col items-center justify-center">
                    <span className="text-amber-400 font-bold text-lg leading-none">{detailItem.rating}</span>
                    <span className="text-amber-400/60 text-[10px]">/10</span>
                  </div>
                )}
              </div>

              {detailItem.mediaItem.genres && detailItem.mediaItem.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detailItem.mediaItem.genres.slice(0, 5).map((g) => (
                    <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/50">{g}</span>
                  ))}
                </div>
              )}

              {(detailItem as any).tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {((detailItem as any).tags as Tag[]).map((tag) => (
                    <span key={tag.id} className="text-xs px-2.5 py-1 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                      🏷 {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {detailItem.review && (
                <div className="bg-muted/20 rounded-xl p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Мой отзыв</p>
                  <p className="text-sm text-foreground leading-relaxed italic">"{detailItem.review}"</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <select value={detailItem.status} onChange={(e) => updateStatus(detailItem.id, e.target.value as CollectionStatus)}
                  className={cn("flex-1 text-xs rounded-xl border px-3 py-2.5 bg-background focus:outline-none font-medium", STATUS_COLORS[detailItem.status])}>
                  {(["WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const).map((s) => (
                    <option key={s} value={s} className="bg-background text-foreground">{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button onClick={() => startEdit(detailItem)}
                  className="flex-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-2.5 rounded-xl transition-colors font-medium">
                  ✏️ Редактировать
                </button>
                <button onClick={() => removeItem(detailItem.id)}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2.5 rounded-xl transition-colors">
                  🗑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT MODAL ─── */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setEditingId(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingId(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-2">
              {[{ id: "main", label: "✏️ Оценка" }, { id: "tags", label: "🏷 Теги" }].map((tab) => (
                <button key={tab.id} onClick={() => setEditTab(tab.id as any)}
                  className={cn("text-sm px-4 py-1.5 rounded-xl border transition-all font-medium",
                    editTab === tab.id ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30")}>
                  {tab.label}
                </button>
              ))}
            </div>

            {editTab === "main" && (
              <>
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
              </>
            )}

            {editTab === "tags" && (
              <>
                <h3 className="font-display font-bold text-lg text-foreground">Теги</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Выбери или создай теги</p>
                  <button onClick={() => setShowTagInput((s) => !s)} className="text-xs text-primary hover:text-primary/80">+ Новый тег</button>
                </div>
                {showTagInput && (
                  <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-xl">
                    <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                      placeholder="Название..."
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                    <div className="flex gap-1">
                      {TAG_COLORS.map((c) => (
                        <button key={c} onClick={() => setNewTagColor(c)}
                          className={cn("w-4 h-4 rounded-full transition-transform", newTagColor === c && "ring-2 ring-offset-1 ring-offset-background ring-white scale-125")}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <button onClick={handleCreateTag} className="text-xs bg-primary text-white px-2 py-1 rounded-lg">ОК</button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {allTags.length === 0 && <p className="text-xs text-muted-foreground">Нет тегов — создай первый!</p>}
                  {allTags.map((tag) => {
                    const active = itemTags.some((t) => t.id === tag.id);
                    return (
                      <div key={tag.id} className="flex items-center gap-1">
                        <button onClick={() => handleToggleTag(tag)}
                          className={cn("text-xs px-3 py-1.5 rounded-full border transition-all font-medium",
                            active ? "text-white border-transparent" : "text-muted-foreground border-border hover:border-primary/30")}
                          style={active ? { backgroundColor: tag.color } : {}}>
                          {active && "✓ "}{tag.name}
                        </button>
                        <button onClick={() => deleteTag(tag.id)}
                          className="text-muted-foreground hover:text-red-400 transition-colors text-xs p-1 rounded-full hover:bg-red-500/10"
                          title="Удалить тег">✕</button>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setEditingId(null)} className="w-full border border-border hover:bg-muted py-2.5 rounded-xl text-sm font-medium text-foreground transition-colors">Готово</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}