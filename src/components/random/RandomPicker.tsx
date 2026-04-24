"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MEDIA_TYPE_ICONS } from "@/types";

interface MediaItem {
  id: string;
  title: string;
  type: "movie" | "book" | "game";
  year: number | null;
  posterUrl: string | null;
  genres: string[];
  description: string | null;
  externalUrl: string | null;
  externalRating: string | null;
}

interface CollectionItem {
  id: string;
  status: string;
  mediaItem: MediaItem;
}

const TYPE_OPTIONS = [
  { value: "", label: "🎲 Всё", color: "border-primary/30 text-primary bg-primary/10" },
  { value: "movie", label: "🎬 Фильм", color: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  { value: "book", label: "📚 Книга", color: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  { value: "game", label: "🎮 Игра", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
];

const ACTION_LABEL: Record<string, string> = {
  movie: "Смотреть",
  book: "Читать",
  game: "Играть",
};

// Основной экспортируемый компонент файла.
export default function RandomPicker() {
  const [type, setType] = useState("");
  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [history, setHistory] = useState<CollectionItem[]>([]);

  const pick = async () => {
    setSpinning(true);
    setLoading(true);
    setEmpty(false);

    // Небольшая пауза нужна, чтобы анимация вращения была заметной.
    await new Promise((r) => setTimeout(r, 600));

    try {
      const url = `/api/random${type ? `?type=${type}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.item) {
        setEmpty(true);
        setItem(null);
      } else {
        setItem(data.item);
        setHistory((prev) => [data.item, ...prev.filter((h) => h.id !== data.item.id)].slice(0, 5));
      }
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  };

  const selectedType = TYPE_OPTIONS.find((t) => t.value === type) ?? TYPE_OPTIONS[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => { setType(opt.value); setItem(null); setEmpty(false); }}
            className={cn("text-sm px-4 py-2 rounded-xl border transition-all font-medium",
              type === opt.value ? opt.color : "border-border text-muted-foreground hover:border-primary/30")}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="glass rounded-3xl p-8 flex flex-col items-center gap-8">
        <div className="relative">
          <button onClick={pick} disabled={loading}
            className={cn(
              "w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-300 group",
              "bg-gradient-to-br from-primary/20 to-violet-600/20 border-primary/30",
              "hover:from-primary/30 hover:to-violet-600/30 hover:border-primary/50 hover:scale-105",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              spinning && "animate-spin"
            )}>
            <span className={cn("text-5xl transition-transform", spinning ? "" : "group-hover:scale-110")}>
              🎲
            </span>
          </button>
          {!loading && !item && !empty && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
              Нажми чтобы выбрать
            </div>
          )}
        </div>

        {empty && (
          <div className="text-center space-y-2 mt-4">
            <p className="text-lg font-medium text-foreground">Список пуст 😅</p>
            <p className="text-sm text-muted-foreground">
              Добавь {type === "movie" ? "фильмы" : type === "book" ? "книги" : type === "game" ? "игры" : "что-нибудь"} в «Хочу»
            </p>
            <a href="/dashboard" className="inline-block text-sm text-primary hover:underline mt-2">
              Найти что-нибудь →
            </a>
          </div>
        )}

        {item && !spinning && (
          <div className="w-full max-w-sm animate-fade-in">
            <div className="glass rounded-2xl overflow-hidden border border-primary/20 shadow-xl shadow-primary/10">
              <div className="aspect-video relative overflow-hidden bg-muted/30">
                {item.mediaItem.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.mediaItem.posterUrl} alt={item.mediaItem.title}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    {MEDIA_TYPE_ICONS[item.mediaItem.type]}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-display font-bold text-white text-lg leading-tight">
                    {item.mediaItem.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white/70 text-xs">
                      {MEDIA_TYPE_ICONS[item.mediaItem.type]} {item.mediaItem.type === "movie" ? "Фильм" : item.mediaItem.type === "book" ? "Книга" : "Игра"}
                    </span>
                    {item.mediaItem.year && (
                      <span className="text-white/70 text-xs">· {item.mediaItem.year}</span>
                    )}
                    {item.mediaItem.externalRating && (
                      <span className="text-amber-400 text-xs">· ★ {item.mediaItem.externalRating}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {item.mediaItem.genres && item.mediaItem.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.mediaItem.genres.slice(0, 3).map((g) => (
                      <span key={g} className="text-xs bg-primary/10 text-primary/80 border border-primary/20 px-2 py-0.5 rounded-md">{g}</span>
                    ))}
                  </div>
                )}

                {item.mediaItem.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {item.mediaItem.description}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={pick} disabled={loading}
                    className="flex-1 text-sm border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl transition-all">
                    🎲 Другое
                  </button>
                  {item.mediaItem.externalUrl && (
                    <a href={item.mediaItem.externalUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-sm bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-2 rounded-xl transition-all text-center font-medium">
                      {ACTION_LABEL[item.mediaItem.type] ?? "Открыть"} ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {history.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Предыдущие варианты</h3>
          <div className="flex gap-3 flex-wrap">
            {history.slice(1).map((h) => (
              <button key={h.id} onClick={() => setItem(h)}
                className="flex items-center gap-2 glass rounded-xl px-3 py-2 hover:border-primary/30 transition-all text-left group">
                <div className="w-8 h-10 rounded-md overflow-hidden bg-muted/50 flex-shrink-0">
                  {h.mediaItem.posterUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={h.mediaItem.posterUrl} alt={h.mediaItem.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-sm">{MEDIA_TYPE_ICONS[h.mediaItem.type]}</div>}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate max-w-[120px] group-hover:text-primary transition-colors">
                    {h.mediaItem.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{h.mediaItem.year ?? "—"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}