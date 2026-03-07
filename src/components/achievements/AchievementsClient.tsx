"use client";

import { cn } from "@/lib/utils";

interface Stats {
  total: number;
  movies: number;
  books: number;
  games: number;
  completed: number;
  dropped: number;
  rated: number;
  reviewed: number;
  avgRating: number;
  hasAllTypes: boolean;
  logCount: number;
}

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: "collection" | "movies" | "books" | "games" | "activity";
  unlocked: boolean;
  progress: number;   // 0–100
  current: number;
  target: number;
  unit: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const RARITY_STYLES = {
  common:    { label: "Обычное",    border: "border-slate-500/30",   bg: "bg-slate-500/10",   text: "text-slate-400",   glow: "" },
  rare:      { label: "Редкое",     border: "border-blue-500/40",    bg: "bg-blue-500/10",    text: "text-blue-400",    glow: "shadow-blue-500/20" },
  epic:      { label: "Эпическое",  border: "border-violet-500/40",  bg: "bg-violet-500/10",  text: "text-violet-400",  glow: "shadow-violet-500/20" },
  legendary: { label: "Легендарное",border: "border-amber-500/40",   bg: "bg-amber-500/10",   text: "text-amber-400",   glow: "shadow-amber-500/30" },
};

function buildAchievements(s: Stats): Achievement[] {
  return [
    // ── Коллекция ───────────────────────────────────────────────
    {
      id: "first_step", icon: "🌱", title: "Первый шаг", rarity: "common",
      description: "Добавь первый элемент в коллекцию",
      category: "collection", unit: "элемент",
      current: Math.min(s.total, 1), target: 1,
      unlocked: s.total >= 1,
      progress: Math.min(s.total / 1 * 100, 100),
    },
    {
      id: "collector_10", icon: "📦", title: "Коллекционер", rarity: "common",
      description: "Добавь 10 элементов в коллекцию",
      category: "collection", unit: "элементов",
      current: Math.min(s.total, 10), target: 10,
      unlocked: s.total >= 10,
      progress: Math.min(s.total / 10 * 100, 100),
    },
    {
      id: "collector_50", icon: "🗄️", title: "Архивариус", rarity: "rare",
      description: "Добавь 50 элементов в коллекцию",
      category: "collection", unit: "элементов",
      current: Math.min(s.total, 50), target: 50,
      unlocked: s.total >= 50,
      progress: Math.min(s.total / 50 * 100, 100),
    },
    {
      id: "collector_100", icon: "🏛️", title: "Хранитель библиотеки", rarity: "epic",
      description: "Добавь 100 элементов в коллекцию",
      category: "collection", unit: "элементов",
      current: Math.min(s.total, 100), target: 100,
      unlocked: s.total >= 100,
      progress: Math.min(s.total / 100 * 100, 100),
    },
    {
      id: "all_types", icon: "🌐", title: "Разносторонний", rarity: "rare",
      description: "Добавь фильм, книгу и игру в коллекцию",
      category: "collection", unit: "типов",
      current: [s.movies > 0, s.books > 0, s.games > 0].filter(Boolean).length, target: 3,
      unlocked: s.hasAllTypes,
      progress: [s.movies > 0, s.books > 0, s.games > 0].filter(Boolean).length / 3 * 100,
    },

    // ── Завершённые ─────────────────────────────────────────────
    {
      id: "completed_1", icon: "✅", title: "Финишёр", rarity: "common",
      description: "Завершил первый элемент коллекции",
      category: "collection", unit: "завершено",
      current: Math.min(s.completed, 1), target: 1,
      unlocked: s.completed >= 1,
      progress: Math.min(s.completed / 1 * 100, 100),
    },
    {
      id: "completed_10", icon: "🏅", title: "Марафонец", rarity: "rare",
      description: "Заверши 10 элементов коллекции",
      category: "collection", unit: "завершено",
      current: Math.min(s.completed, 10), target: 10,
      unlocked: s.completed >= 10,
      progress: Math.min(s.completed / 10 * 100, 100),
    },
    {
      id: "completed_50", icon: "🏆", title: "Чемпион", rarity: "legendary",
      description: "Заверши 50 элементов коллекции",
      category: "collection", unit: "завершено",
      current: Math.min(s.completed, 50), target: 50,
      unlocked: s.completed >= 50,
      progress: Math.min(s.completed / 50 * 100, 100),
    },

    // ── Фильмы ──────────────────────────────────────────────────
    {
      id: "movies_5", icon: "🎬", title: "Киноман", rarity: "common",
      description: "Добавь 5 фильмов в коллекцию",
      category: "movies", unit: "фильмов",
      current: Math.min(s.movies, 5), target: 5,
      unlocked: s.movies >= 5,
      progress: Math.min(s.movies / 5 * 100, 100),
    },
    {
      id: "movies_25", icon: "🎥", title: "Синефил", rarity: "rare",
      description: "Добавь 25 фильмов в коллекцию",
      category: "movies", unit: "фильмов",
      current: Math.min(s.movies, 25), target: 25,
      unlocked: s.movies >= 25,
      progress: Math.min(s.movies / 25 * 100, 100),
    },

    // ── Книги ───────────────────────────────────────────────────
    {
      id: "books_5", icon: "📚", title: "Читатель", rarity: "common",
      description: "Добавь 5 книг в коллекцию",
      category: "books", unit: "книг",
      current: Math.min(s.books, 5), target: 5,
      unlocked: s.books >= 5,
      progress: Math.min(s.books / 5 * 100, 100),
    },
    {
      id: "books_25", icon: "📖", title: "Книжный червь", rarity: "rare",
      description: "Добавь 25 книг в коллекцию",
      category: "books", unit: "книг",
      current: Math.min(s.books, 25), target: 25,
      unlocked: s.books >= 25,
      progress: Math.min(s.books / 25 * 100, 100),
    },

    // ── Игры ────────────────────────────────────────────────────
    {
      id: "games_5", icon: "🎮", title: "Геймер", rarity: "common",
      description: "Добавь 5 игр в коллекцию",
      category: "games", unit: "игр",
      current: Math.min(s.games, 5), target: 5,
      unlocked: s.games >= 5,
      progress: Math.min(s.games / 5 * 100, 100),
    },
    {
      id: "games_25", icon: "🕹️", title: "Хардкорщик", rarity: "rare",
      description: "Добавь 25 игр в коллекцию",
      category: "games", unit: "игр",
      current: Math.min(s.games, 25), target: 25,
      unlocked: s.games >= 25,
      progress: Math.min(s.games / 25 * 100, 100),
    },

    // ── Активность ──────────────────────────────────────────────
    {
      id: "rated_5", icon: "⭐", title: "Критик", rarity: "common",
      description: "Оцени 5 элементов коллекции",
      category: "activity", unit: "оценок",
      current: Math.min(s.rated, 5), target: 5,
      unlocked: s.rated >= 5,
      progress: Math.min(s.rated / 5 * 100, 100),
    },
    {
      id: "rated_20", icon: "🌟", title: "Эксперт", rarity: "rare",
      description: "Оцени 20 элементов коллекции",
      category: "activity", unit: "оценок",
      current: Math.min(s.rated, 20), target: 20,
      unlocked: s.rated >= 20,
      progress: Math.min(s.rated / 20 * 100, 100),
    },
    {
      id: "reviewed_3", icon: "💬", title: "Рецензент", rarity: "common",
      description: "Оставь отзывы на 3 элемента",
      category: "activity", unit: "отзывов",
      current: Math.min(s.reviewed, 3), target: 3,
      unlocked: s.reviewed >= 3,
      progress: Math.min(s.reviewed / 3 * 100, 100),
    },
    {
      id: "reviewed_10", icon: "✍️", title: "Литератор", rarity: "epic",
      description: "Оставь отзывы на 10 элементов",
      category: "activity", unit: "отзывов",
      current: Math.min(s.reviewed, 10), target: 10,
      unlocked: s.reviewed >= 10,
      progress: Math.min(s.reviewed / 10 * 100, 100),
    },
    {
      id: "high_taste", icon: "🎯", title: "Высокие стандарты", rarity: "epic",
      description: "Средняя оценка коллекции выше 8",
      category: "activity", unit: "",
      current: Math.round(s.avgRating * 10) / 10, target: 8,
      unlocked: s.avgRating >= 8 && s.rated >= 5,
      progress: Math.min(s.avgRating / 8 * 100, 100),
    },
    {
      id: "dropped_3", icon: "🚫", title: "Беспощадный", rarity: "common",
      description: "Брось 3 элемента — жизнь слишком коротка",
      category: "activity", unit: "брошено",
      current: Math.min(s.dropped, 3), target: 3,
      unlocked: s.dropped >= 3,
      progress: Math.min(s.dropped / 3 * 100, 100),
    },
  ];
}

const CATEGORY_LABELS: Record<string, string> = {
  collection: "📦 Коллекция",
  movies: "🎬 Фильмы",
  books: "📚 Книги",
  games: "🎮 Игры",
  activity: "⚡ Активность",
};

export default function AchievementsClient({ stats }: { stats: Stats }) {
  const achievements = buildAchievements(stats);
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const totalProgress = Math.round(unlocked.length / achievements.length * 100);

  const categories = ["collection", "movies", "books", "games", "activity"] as const;

  return (
    <div className="space-y-8">
      {/* Header stats */}
      <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Общий прогресс</span>
            <span className="font-display font-bold text-lg text-foreground">
              {unlocked.length} / {achievements.length}
            </span>
          </div>
          <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all duration-1000"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{totalProgress}% достижений получено</p>
        </div>

        {/* Rarity counts */}
        <div className="flex gap-4">
          {(["legendary", "epic", "rare", "common"] as const).map((rarity) => {
            const count = unlocked.filter((a) => a.rarity === rarity).length;
            const style = RARITY_STYLES[rarity];
            return (
              <div key={rarity} className="text-center">
                <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center text-lg mx-auto", style.border, style.bg)}>
                  {rarity === "legendary" ? "👑" : rarity === "epic" ? "💎" : rarity === "rare" ? "🔷" : "⬜"}
                </div>
                <p className={cn("text-lg font-bold mt-1", style.text)}>{count}</p>
                <p className="text-xs text-muted-foreground">{style.label.split(" ")[0]}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unlocked first */}
      {unlocked.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            🏆 Получено <span className="text-sm font-normal text-muted-foreground">({unlocked.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlocked.map((a) => {
              const style = RARITY_STYLES[a.rarity];
              return (
                <div key={a.id}
                  className={cn("rounded-2xl border p-5 space-y-3 transition-all hover:-translate-y-0.5 hover:shadow-lg", style.border, style.bg, unlocked && style.glow ? `shadow-md ${style.glow}` : "")}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{a.icon}</div>
                      <div>
                        <p className="font-display font-bold text-foreground leading-tight">{a.title}</p>
                        <span className={cn("text-xs font-medium", style.text)}>{style.label}</span>
                      </div>
                    </div>
                    <div className="text-emerald-400 text-xl">✓</div>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked by category */}
      {categories.map((cat) => {
        const catLocked = locked.filter((a) => a.category === cat);
        if (catLocked.length === 0) return null;
        return (
          <div key={cat} className="space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              {CATEGORY_LABELS[cat]}
              <span className="text-sm font-normal text-muted-foreground">({catLocked.length} осталось)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catLocked.map((a) => {
                const style = RARITY_STYLES[a.rarity];
                return (
                  <div key={a.id} className="glass rounded-2xl border border-border p-5 space-y-3 opacity-70 hover:opacity-90 transition-opacity">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl grayscale">{a.icon}</div>
                        <div>
                          <p className="font-display font-bold text-foreground leading-tight">{a.title}</p>
                          <span className={cn("text-xs font-medium", style.text)}>{style.label}</span>
                        </div>
                      </div>
                      <div className="text-muted-foreground/40 text-xl">🔒</div>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.description}</p>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Прогресс</span>
                        <span>{a.current} / {a.target} {a.unit}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", style.text.replace("text-", "bg-"))}
                          style={{ width: `${a.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {locked.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <div className="text-6xl">🎉</div>
          <p className="font-display text-xl font-bold text-foreground">Все достижения получены!</p>
          <p className="text-muted-foreground text-sm">Ты настоящий мастер коллекционирования</p>
        </div>
      )}
    </div>
  );
}