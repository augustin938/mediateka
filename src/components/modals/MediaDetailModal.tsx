"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { SearchResultItem } from "@/types";
import { MEDIA_TYPE_ICONS, MEDIA_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/types";
import { cn } from "@/lib/utils";

interface Tag { id: string; name: string; color: string; }

interface MediaDetailModalProps {
  item: SearchResultItem;
  onClose: () => void;
  onAddToCollection: (item: SearchResultItem) => void;
}

const STATUSES = ["WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const;

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

export default function MediaDetailModal({ item, onClose, onAddToCollection }: MediaDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"WANT" | "IN_PROGRESS" | "COMPLETED" | "DROPPED">("WANT");

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [itemTags, setItemTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [collectionItemId, setCollectionItemId] = useState<string | null>(item.collectionItemId ?? null);

  // Теги подгружаем только если элемент уже есть в коллекции.
  useEffect(() => {
    if (!item.inCollection) return;
    setTagsLoading(true);
    Promise.all([
      fetch("/api/tags").then((r) => r.json()),
      collectionItemId
        ? fetch(`/api/collection/${collectionItemId}/tags`).then((r) => r.json())
        : Promise.resolve({ tags: [] }),
    ]).then(([allData, itemData]) => {
      setAllTags(allData.tags ?? []);
      setItemTags(itemData.tags ?? []);
    }).finally(() => setTagsLoading(false));
  }, [item.inCollection, collectionItemId]);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaItemId: item.id, status: selectedStatus,
          externalId: item.externalId, type: item.type, title: item.title,
          originalTitle: item.originalTitle, description: item.description,
          posterUrl: item.posterUrl, year: item.year, genres: item.genres,
          externalRating: item.externalRating, externalUrl: item.externalUrl,
          director: item.director, author: item.author, developer: item.developer,
        }),
      });

      if (res.status === 409) {
        toast.info("Уже в коллекции");
        onAddToCollection(item);
        onClose();
        return;
      }
      if (!res.ok) throw new Error("Failed to add");

      const data = await res.json();
      setCollectionItemId(data.item?.id ?? null);
      toast.success(`«${item.title}» добавлено в коллекцию!`);
      onAddToCollection({ ...item, inCollection: true, collectionStatus: selectedStatus });
      onClose();
    } catch {
      toast.error("Ошибка при добавлении в коллекцию");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = async (tag: Tag) => {
    if (!collectionItemId) return;
    const hasTag = itemTags.some((t) => t.id === tag.id);
    if (hasTag) {
      await fetch(`/api/collection/${collectionItemId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: tag.id }),
      });
      setItemTags((prev) => prev.filter((t) => t.id !== tag.id));
    } else {
      await fetch(`/api/collection/${collectionItemId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: tag.id }),
      });
      setItemTags((prev) => [...prev, tag]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    if (res.status === 409) { toast.error("Тег уже существует"); return; }
    const data = await res.json();
    setAllTags((prev) => [...prev, data.tag]);
    setNewTagName("");
    setShowTagInput(false);
    // Новый тег сразу привязываем к текущему элементу.
    if (collectionItemId) {
      await fetch(`/api/collection/${collectionItemId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: data.tag.id }),
      });
      setItemTags((prev) => [...prev, data.tag]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg glass rounded-2xl overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto scrollbar-hide">
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-background/40 hover:bg-background/60 border border-border/60 flex items-center justify-center transition-colors focus-ring">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col sm:flex-row gap-0 sm:gap-6 p-6">
          <div className="w-full sm:w-36 flex-shrink-0">
            <div className="aspect-[2/3] sm:aspect-auto sm:h-52 bg-muted/50 rounded-xl overflow-hidden">
              {item.posterUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-5xl">{MEDIA_TYPE_ICONS[item.type]}</div>}
            </div>
          </div>

          <div className="flex-1 space-y-4 mt-4 sm:mt-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                  {MEDIA_TYPE_ICONS[item.type]} {MEDIA_TYPE_LABELS[item.type]}
                </span>
                {item.year && <span className="text-xs text-muted-foreground">{item.year}</span>}
              </div>
              <h2 className="font-display text-xl font-bold leading-tight">{item.title}</h2>
              {item.originalTitle && item.originalTitle !== item.title && (
                <p className="text-sm text-muted-foreground mt-0.5">{item.originalTitle}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {item.externalRating && (
                <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">★ {item.externalRating}</span>
              )}
              {item.director && <span className="text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">Реж.: {item.director}</span>}
              {item.author && <span className="text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">Авт.: {item.author}</span>}
              {item.developer && <span className="text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">Разр.: {item.developer}</span>}
            </div>

            {item.genres && item.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.genres.slice(0, 5).map((g) => (
                  <span key={g} className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">{g}</span>
                ))}
              </div>
            )}

            {item.description && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{item.description}</p>
            )}

            {item.externalUrl && (
              <a href={item.externalUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary/70 hover:text-primary transition-colors underline underline-offset-2">
                Открыть источник ↗
              </a>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4 border-t border-border/60 pt-4">
          {item.inCollection ? (
            <>
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Уже в коллекции
                {item.collectionStatus && (
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border ml-1", STATUS_COLORS[item.collectionStatus])}>
                    {STATUS_LABELS[item.collectionStatus]}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground/80">🏷 Теги</p>
                  <button onClick={() => setShowTagInput((s) => !s)}
                    className="text-xs text-primary hover:text-primary/80 transition-colors focus-ring rounded-lg px-2 py-1">
                    + Создать тег
                  </button>
                </div>

                {showTagInput && (
                  <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-xl">
                    <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                      placeholder="Название тега..."
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus-ring rounded-lg" />
                    <div className="flex gap-1">
                      {TAG_COLORS.map((c) => (
                        <button key={c} onClick={() => setNewTagColor(c)}
                          className={cn("w-4 h-4 rounded-full transition-transform focus-ring", newTagColor === c && "ring-2 ring-offset-1 ring-offset-background ring-primary/60 scale-125")}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <button onClick={handleCreateTag}
                      className="text-xs bg-primary text-white px-2 py-1 rounded-lg hover:bg-primary/90 transition-colors focus-ring">
                      ОК
                    </button>
                  </div>
                )}

                {tagsLoading ? (
                  <div className="flex gap-1.5">
                    {[1,2,3].map((i) => <div key={i} className="h-6 w-16 bg-muted/40 rounded-full animate-pulse" />)}
                  </div>
                ) : allTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((tag) => {
                      const active = itemTags.some((t) => t.id === tag.id);
                      return (
                        <button key={tag.id} onClick={() => handleToggleTag(tag)}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full border transition-all",
                            active ? "text-white border-transparent" : "text-muted-foreground border-border hover:border-primary/30"
                          )}
                          style={active ? { backgroundColor: tag.color, borderColor: tag.color } : {}}>
                          {active && "✓ "}{tag.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Нет тегов — создай первый!</p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground/80">Добавить в коллекцию</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map((status) => (
                  <button key={status} onClick={() => setSelectedStatus(status)}
                    className={cn(
                      "text-xs px-3 py-2 rounded-xl border transition-all duration-200 font-medium focus-ring",
                      selectedStatus === status
                        ? STATUS_COLORS[status] + " ring-2 ring-offset-1 ring-offset-background ring-current/30"
                        : "border-border/70 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                    )}>
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
              <button onClick={handleAdd} disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm focus-ring interactive-soft">
                {loading ? "Добавление..." : "Добавить в коллекцию →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}