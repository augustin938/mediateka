"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime, getRelativeDayLabel } from "@/lib/date";
import { MEDIA_TYPE_ICONS } from "@/types";

interface ActivityLog {
  id: string;
  action: string;
  mediaTitle: string;
  mediaType: "movie" | "book" | "game";
  mediaId: string;
  posterUrl: string | null;
  details: string | null;
  createdAt: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  added:     { label: "Добавил в коллекцию",  icon: "➕", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  completed: { label: "Завершил",              icon: "✅", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  started:   { label: "Начал",                 icon: "▶️", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  dropped:   { label: "Бросил",                icon: "🚫", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  rated:     { label: "Оценил",                icon: "⭐", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  reviewed:  { label: "Оставил отзыв на",      icon: "💬", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
  want:      { label: "Хочет",      icon: "🔖", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
};

function groupByDate(logs: ActivityLog[]) {
  const groups: Record<string, ActivityLog[]> = {};
  logs.forEach((log) => {
    const label = getRelativeDayLabel(log.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(log);
  });
  return groups;
}

export default function ActivityClient() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/activity?limit=100")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.action === filter);
  const groups = groupByDate(filtered);

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g} className="space-y-3">
            <div className="h-4 skeleton rounded w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 flex gap-4 items-center">
                <div className="w-10 h-10 skeleton rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded w-2/3" />
                  <div className="h-3 skeleton rounded w-1/3" />
                </div>
                <div className="w-12 h-12 skeleton rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-24 space-y-4 text-muted-foreground">
        <div className="text-6xl">📭</div>
        <p className="text-lg font-medium text-foreground">История пуста</p>
        <p className="text-sm">Начни добавлять фильмы, книги и игры — здесь появится твоя активность</p>
        <a href="/dashboard" className="inline-flex items-center gap-1 text-sm bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/30 transition-colors">
          Найти что-нибудь →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")}
          className={cn("text-sm px-3 py-1.5 rounded-xl border transition-all font-medium",
            filter === "all" ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30")}>
          Все ({logs.length})
        </button>
        {Object.entries(ACTION_CONFIG).map(([action, cfg]) => {
          const count = logs.filter((l) => l.action === action).length;
          if (count === 0) return null;
          return (
            <button key={action} onClick={() => setFilter(action)}
              className={cn("text-sm px-3 py-1.5 rounded-xl border transition-all font-medium flex items-center gap-1.5",
                filter === action ? cn(cfg.color) : "border-border text-muted-foreground hover:border-primary/30")}>
              {cfg.icon} <span className="hidden sm:inline">{cfg.label.split(" ")[0]}</span>
              <span className="text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Empty filtered */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <div className="text-4xl">🔍</div>
          <p>Нет событий этого типа</p>
          <button onClick={() => setFilter("all")} className="text-primary hover:underline text-sm">Показать все</button>
        </div>
      )}

      {/* Grouped timeline */}
      <div className="space-y-8">
        {Object.entries(groups).map(([date, items]) => (
          <div key={date} className="space-y-3">
            {/* Date label */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-muted-foreground">{date}</span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground/60">{items.length} событий</span>
            </div>

            {/* Events */}
            <div className="space-y-2 relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-5 bottom-5 w-px bg-border/50" />

              {items.map((log) => {
                const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.added;
                return (
                  <div key={log.id} className="flex gap-4 items-center group">
                    {/* Action icon */}
                    <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center text-base flex-shrink-0 z-10 transition-transform group-hover:scale-110", cfg.color)}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="glass rounded-xl p-3 flex-1 flex items-center gap-3 group-hover:border-primary/20 transition-colors min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">
                          <span className="text-muted-foreground">{cfg.label} </span>
                          <span className="font-semibold">{log.mediaTitle}</span>
                          {log.details && (
                            <span className="text-muted-foreground"> · {log.details}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground/60">
                            {MEDIA_TYPE_ICONS[log.mediaType]}
                            {" "}
                            {log.mediaType === "movie" ? "Фильм" : log.mediaType === "book" ? "Книга" : "Игра"}
                          </span>
                          <span className="text-xs text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground/60">{formatRelativeTime(log.createdAt)}</span>
                        </div>
                      </div>

                      {/* Poster thumbnail */}
                      {log.posterUrl && (
                        <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={log.posterUrl} alt={log.mediaTitle} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}