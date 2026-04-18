"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  section?: string;
}

interface Meta {
  topGenres: string[];
  typeCounts: Record<string, number>;
  total: number;
}

const TYPE_LABELS = { all: "Все", movie: "🎬 Фильмы", book: "📚 Книги", game: "🎮 Игры" };

const TYPE_SECTION_COLORS: Record<string, string> = {
  movie: "from-blue-500/20 to-indigo-500/5",
  book: "from-amber-500/20 to-orange-500/5",
  game: "from-emerald-500/20 to-teal-500/5",
};

const STATUS_OPTIONS: Record<string, { value: string; label: string; color: string }[]> = {
  movie: [
    { value: "WANT",        label: "🔖 Хочу посмотреть", color: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" },
    { value: "IN_PROGRESS", label: "▶️ Смотрю",           color: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30" },
    { value: "COMPLETED",   label: "✅ Посмотрел",        color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" },
  ],
  book: [
    { value: "WANT",        label: "🔖 Хочу прочитать",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" },
    { value: "IN_PROGRESS", label: "📖 Читаю",            color: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30" },
    { value: "COMPLETED",   label: "✅ Прочитал",         color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" },
  ],
  game: [
    { value: "WANT",        label: "🔖 Хочу поиграть",   color: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" },
    { value: "IN_PROGRESS", label: "🎮 Играю",            color: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30" },
    { value: "COMPLETED",   label: "✅ Прошёл",           color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" },
  ],
};

function AddModal({
  rec,
  onConfirm,
  onClose,
  saving,
}: {
  rec: Recommendation;
  onConfirm: (rec: Recommendation, status: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const statusOpts = STATUS_OPTIONS[rec.type] ?? STATUS_OPTIONS.movie;
  const typeLabel = rec.type === "movie" ? "Фильм" : rec.type === "book" ? "Книга" : "Игра";

  // Закрываем модалку по Escape, чтобы не требовать клика мышью.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative glass rounded-2xl w-full max-w-sm overflow-hidden animate-fade-in-scale shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-40 bg-muted/30 overflow-hidden">
          {rec.posterUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={rec.posterUrl} alt={rec.title} className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
            : <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-primary/10 to-primary/5">{MEDIA_TYPE_ICONS[rec.type]}</div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors text-sm focus-ring interactive-soft border border-black/10 dark:border-white/10 shadow-lg"
          >✕</button>
          <div className="absolute bottom-3 left-3 right-3">
            <span className="text-[10px] text-primary bg-primary/20 border border-primary/30 px-2 py-0.5 rounded-md font-medium">
              {MEDIA_TYPE_ICONS[rec.type]} {typeLabel}
            </span>
            <h3 className="font-display font-bold text-white text-lg leading-tight mt-1 line-clamp-2">{rec.title}</h3>
            {rec.year && <p className="text-white/50 text-xs mt-0.5">{rec.year}</p>}
          </div>
        </div>

        <div className="px-4 pt-3 pb-1 space-y-2">
          {rec.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {rec.genres.slice(0, 4).map((g) => (
                <span key={g} className="text-[9px] bg-muted/60 text-muted-foreground border border-border/50 px-2 py-0.5 rounded-full">{g}</span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary">✦</span> {rec.reason}
          </p>
        </div>

        <div className="p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Добавить со статусом:</p>
          {statusOpts.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onConfirm(rec, opt.value)}
              disabled={saving}
              className={cn(
                "w-full text-sm px-4 py-2.5 rounded-xl border transition-all font-medium",
                opt.color,
                saving && "opacity-50 cursor-not-allowed"
              )}
            >
              {saving ? "Добавляем..." : opt.label}
            </button>
          ))}
          {rec.externalUrl && (
            <a
              href={rec.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 px-4 py-2 rounded-xl transition-colors mt-1"
            >
              Подробнее ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function RecCard({ rec, index, onOpenModal }: {
  rec: Recommendation;
  index: number;
  onOpenModal: (rec: Recommendation) => void;
}) {
  return (
    <div
      className="flex-shrink-0 w-[190px] glass rounded-xl overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 flex flex-col cursor-pointer"
      onClick={() => onOpenModal(rec)}
    >
      <div className="relative h-[260px] bg-muted/30 overflow-hidden flex-shrink-0">
        {rec.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rec.posterUrl}
            alt={rec.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-primary/10 to-primary/5">
            {MEDIA_TYPE_ICONS[rec.type]}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {rec.year && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[10px] text-white/80 font-medium border border-black/10 dark:border-white/10 shadow-lg">
            {rec.year}
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onOpenModal(rec); }}
          className="absolute bottom-2 right-2 w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:shadow-primary/40 focus-ring interactive-soft"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="text-white text-xs font-bold leading-tight line-clamp-2 font-display">{rec.title}</p>
        </div>
      </div>

      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        {rec.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {rec.genres.slice(0, 2).map((g) => (
              <span key={g} className="text-[9px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/50">{g}</span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
          <span className="text-primary">✦</span> {rec.reason}
        </p>
      </div>
    </div>
  );
}

function RecRow({ title, icon, items, onOpenModal }: {
  title: string;
  icon: string;
  items: Recommendation[];
  onOpenModal: (rec: Recommendation) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") =>
    rowRef.current?.scrollBy({ left: dir === "left" ? -380 : 380, behavior: "smooth" });

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h2 className="font-display font-bold text-lg text-foreground">{title}</h2>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="flex gap-1">
          {(["left", "right"] as const).map((dir) => (
            <button key={dir} onClick={() => scroll(dir)}
              className="w-7 h-7 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all flex items-center justify-center text-sm">
              {dir === "left" ? "‹" : "›"}
            </button>
          ))}
        </div>
      </div>
      <div ref={rowRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {items.map((rec, i) => (
          <RecCard key={`${rec.type}_${rec.title}_${i}`} rec={rec} index={i} onOpenModal={onOpenModal} />
        ))}
      </div>
    </div>
  );
}

function HeroBanner({ rec, onOpenModal }: { rec: Recommendation; onOpenModal: (rec: Recommendation) => void }) {
  const typeLabel = rec.type === "movie" ? "Фильм" : rec.type === "book" ? "Книга" : "Игра";
  return (
    <div
      className="relative rounded-2xl overflow-hidden glass cursor-pointer h-64 md:h-72 group"
      onClick={() => onOpenModal(rec)}
    >
      {rec.posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={rec.posterUrl} alt={rec.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute inset-0 p-6 flex flex-col justify-end max-w-lg">
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/30 text-primary border border-primary/30 px-2 py-0.5 rounded-md font-medium backdrop-blur-sm">
              {MEDIA_TYPE_ICONS[rec.type]} {typeLabel}
            </span>
            {rec.year && <span className="text-xs text-white/50">{rec.year}</span>}
          </div>
          <h3 className="font-display font-bold text-2xl text-white leading-tight">{rec.title}</h3>
          {rec.genres.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {rec.genres.slice(0, 3).map((g) => (
                <span key={g} className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded-md border border-white/10">{g}</span>
              ))}
            </div>
          )}
          <p className="text-sm text-white/70 leading-relaxed line-clamp-2">
            <span className="text-primary">✦</span> {rec.reason}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenModal(rec); }}
          className="self-start text-sm bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl transition-all font-semibold shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 focus-ring interactive-soft"
        >
          + В коллекцию
        </button>
      </div>
    </div>
  );
}

const CAROUSEL_INTERVAL = 5000;

function HeroCarousel({
  movie,
  book,
  game,
  onOpenModal,
}: {
  movie: Recommendation | null;
  book: Recommendation | null;
  game: Recommendation | null;
  onOpenModal: (rec: Recommendation) => void;
}) {
  const slides = [movie, book, game].filter(Boolean) as Recommendation[];
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (i: number) => {
    setIdx(i);
    resetTimer();
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    // После ручного переключения перезапускаем автопрокрутку с нуля.
    timerRef.current = setInterval(() => setIdx((p) => (p + 1) % slides.length), CAROUSEL_INTERVAL);
  };

  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => setIdx((p) => (p + 1) % slides.length), CAROUSEL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length]);

  if (slides.length === 0) return null;

  const rec = slides[idx];
  const typeLabel = rec.type === "movie" ? "Фильм" : rec.type === "book" ? "Книга" : "Игра";

  return (
    <div className="relative rounded-2xl overflow-hidden glass h-64 md:h-80 group cursor-pointer" onClick={() => onOpenModal(rec)}>
      {slides.map((s, i) => (
        s.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${s.type}_${s.title}`}
            src={s.posterUrl}
            alt={s.title}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
              i === idx ? "opacity-100 scale-105" : "opacity-0 scale-100"
            )}
            style={{ transition: "opacity 0.7s ease, transform 6s ease" }}
            loading="lazy"
          />
        )
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="absolute inset-0 p-6 flex flex-col justify-end max-w-lg">
        <div className="space-y-2 mb-4 animate-fade-in" key={idx}>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/30 text-primary border border-primary/30 px-2 py-0.5 rounded-md font-medium backdrop-blur-sm">
              {MEDIA_TYPE_ICONS[rec.type]} {typeLabel}
            </span>
            {rec.year && <span className="text-xs text-white/50">{rec.year}</span>}
          </div>
          <h3 className="font-display font-bold text-2xl md:text-3xl text-white leading-tight">{rec.title}</h3>
          {rec.genres.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {rec.genres.slice(0, 3).map((g) => (
                <span key={g} className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded-md border border-white/10">{g}</span>
              ))}
            </div>
          )}
          <p className="text-sm text-white/70 leading-relaxed line-clamp-2">
            <span className="text-primary">✦</span> {rec.reason}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenModal(rec); }}
          className="self-start text-sm bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl transition-all font-semibold shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 focus-ring interactive-soft"
        >
          + В коллекцию
        </button>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-4 right-5 flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
              className={cn(
                "rounded-full transition-all duration-300 focus-ring",
                i === idx
                  ? "w-6 h-2 bg-primary"
                  : "w-2 h-2 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      )}

      <div className="absolute top-4 right-4 flex gap-1.5">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
            className={cn(
              "text-sm transition-all duration-200 focus-ring rounded-lg px-1.5",
              i === idx ? "opacity-100 scale-110" : "opacity-40 hover:opacity-70"
            )}
          >
            {MEDIA_TYPE_ICONS[s.type]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RecommendationsClient() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [crossRecs, setCrossRecs] = useState<Recommendation[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "book" | "game">("all");
  const [seed, setSeed] = useState(0);
  const [modalRec, setModalRec] = useState<Recommendation | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setRecs([]);
    setCrossRecs([]);
    Promise.all([
      fetch(`/api/recommendations?seed=${seed}`).then((r) => r.json()),
      fetch("/api/collection").then((r) => r.json()),
    ]).then(([recsData, collectionData]) => {
      if (recsData.reason === "empty") { setEmpty(true); return; }
      setEmpty(false);
      if (recsData.meta) setMeta(recsData.meta);
      const inCollection = new Set<string>(
        (collectionData.items ?? []).map((item: any) =>
          `${item.mediaItem.type}_${item.mediaItem.title.toLowerCase().trim()}`
        )
      );
      const seen = new Set<string>();
      const filtered = (recsData.recommendations ?? []).filter((r: Recommendation) => {
        const key = `${r.type}_${r.title.toLowerCase().trim()}`;
        if (seen.has(key) || inCollection.has(key)) return false;
        seen.add(key);
        return true;
      });
      setRecs(filtered);

      const crossFiltered = (recsData.crossRecommendations ?? []).filter((r: Recommendation) => {
        const key = `${r.type}_${r.title.toLowerCase().trim()}`;
        return !inCollection.has(key);
      });
      setCrossRecs(crossFiltered);
    }).finally(() => setLoading(false));
  }, [seed]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => { setModalRec(null); setSeed((s) => s + 1); };

  const addToCollection = async (rec: Recommendation, status: string) => {
    setSaving(true);
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
        toast.success(`«${rec.title}» добавлен!`);
        setModalRec(null);
        const key = `${rec.type}_${rec.title.toLowerCase().trim()}`;
        setRecs((prev) => prev.filter((r) => `${r.type}_${r.title.toLowerCase().trim()}` !== key));
      } else {
        toast.error("Ошибка добавления");
      }
    } catch {
      toast.error("Ошибка добавления");
    } finally {
      setSaving(false);
    }
  };

  const visible = recs.filter((r) => typeFilter === "all" || r.type === typeFilter);
  const movies  = visible.filter((r) => r.type === "movie");
  const books   = visible.filter((r) => r.type === "book");
  const games   = visible.filter((r) => r.type === "game");
  const counts  = {
    all: recs.length,
    movie: recs.filter((r) => r.type === "movie").length,
    book:  recs.filter((r) => r.type === "book").length,
    game:  recs.filter((r) => r.type === "game").length,
  };

  // Для карусели берем по одному элементу с постером на каждый тип.
  const featuredMovie = recs.find((r) => r.type === "movie" && r.posterUrl) ?? null;
  const featuredBook  = recs.find((r) => r.type === "book"  && r.posterUrl) ?? null;
  const featuredGame  = recs.find((r) => r.type === "game"  && r.posterUrl) ?? null;
  // Для вкладки конкретного типа берем первый элемент с постером.
  const featuredSingle = visible.find((r) => r.posterUrl) ?? null;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-72 skeleton rounded-2xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 skeleton rounded-lg w-48" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex-shrink-0 w-[190px] h-[360px] skeleton rounded-xl" />
              ))}
            </div>
          </div>
        ))}
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
        <p className="text-sm max-w-sm mx-auto">Добавь завершённые фильмы, книги или игры — и мы подберём что-нибудь интересное</p>
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
        <button onClick={handleRefresh}
          className="inline-flex items-center gap-2 text-sm bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/30 transition-colors">
          🔄 Обновить рекомендации
        </button>
      </div>
    );
  }

  return (
    <>
      {modalRec && (
        <AddModal
          rec={modalRec}
          onConfirm={addToCollection}
          onClose={() => setModalRec(null)}
          saving={saving}
        />
      )}

      <div className="space-y-8">
        {meta && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground animate-fade-in">
            <span>Найдено: <span className="text-foreground font-medium">{meta.total}</span></span>
            {meta.topGenres.length > 0 && (
              <>
                <span>·</span>
                <span>Твои жанры:</span>
                {meta.topGenres.slice(0, 4).map((g) => (
                  <span key={g} className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{g}</span>
                ))}
              </>
            )}
          </div>
        )}

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

        {typeFilter === "all"
          ? <HeroCarousel
              movie={featuredMovie}
              book={featuredBook}
              game={featuredGame}
              onOpenModal={setModalRec}
            />
          : featuredSingle && <HeroBanner rec={featuredSingle} onOpenModal={setModalRec} />
        }

        <div className="space-y-10">
          {typeFilter === "all" && crossRecs.length > 0 && (
            <div className="rounded-2xl p-5 bg-gradient-to-br border border-border/50 from-fuchsia-500/15 to-violet-500/5">
              <RecRow title="Кросс-рекомендации" icon="✨" items={crossRecs} onOpenModal={setModalRec} />
            </div>
          )}
          {(typeFilter === "all" || typeFilter === "movie") && movies.length > 0 && (
            <div className={cn("rounded-2xl p-5 bg-gradient-to-br border border-border/50", TYPE_SECTION_COLORS.movie)}>
              <RecRow title="Фильмы для тебя" icon="🎬" items={movies} onOpenModal={setModalRec} />
            </div>
          )}
          {(typeFilter === "all" || typeFilter === "game") && games.length > 0 && (
            <div className={cn("rounded-2xl p-5 bg-gradient-to-br border border-border/50", TYPE_SECTION_COLORS.game)}>
              <RecRow title="Игры для тебя" icon="🎮" items={games} onOpenModal={setModalRec} />
            </div>
          )}
          {(typeFilter === "all" || typeFilter === "book") && books.length > 0 && (
            <div className={cn("rounded-2xl p-5 bg-gradient-to-br border border-border/50", TYPE_SECTION_COLORS.book)}>
              <RecRow title="Книги для тебя" icon="📚" items={books} onOpenModal={setModalRec} />
            </div>
          )}
        </div>

        {visible.length === 0 && (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <div className="text-4xl">{MEDIA_TYPE_ICONS[typeFilter as "movie" | "book" | "game"] ?? "🔍"}</div>
            <p>Нет рекомендаций по этому типу</p>
            <button onClick={() => setTypeFilter("all")} className="text-primary hover:underline text-sm">Показать все</button>
          </div>
        )}
      </div>
    </>
  );
}