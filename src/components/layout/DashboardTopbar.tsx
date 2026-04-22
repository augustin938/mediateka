"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MEDIA_TYPE_ICONS } from "@/types";
import NotificationsBell from "@/components/notifications/NotificationsBell";

interface SearchResult {
  id: string;
  type: "movie" | "book" | "game";
  title: string;
  year: number | null;
  posterUrl: string | null;
}

const RECENT_SEARCHES_KEY = "mediateka-recent-searches";
const RECENT_SEARCHES_MAX = 8;

type QuickLink = { href: string; label: string; icon: string };
const QUICK_LINKS: QuickLink[] = [
  { href: "/dashboard", label: "Поиск", icon: "🔍" },
  { href: "/collection", label: "Коллекция", icon: "📚" },
  { href: "/recommendations", label: "Для тебя", icon: "🎯" },
  { href: "/random", label: "Сегодня", icon: "🎲" },
  { href: "/friends", label: "Друзья", icon: "👥" },
  { href: "/quiz", label: "Квиз", icon: "🎮" },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":       "Поиск",
  "/collection":      "Коллекция",
  "/recommendations": "Для тебя",
  "/tops":            "Топы",
  "/quiz":            "Квиз",
  "/random":          "Сегодня",
  "/friends":         "Друзья",
  "/achievements":    "Достижения",
  "/stats":           "Статистика",
  "/activity":        "История",
  "/profile":         "Профиль",
};

const THEMES = [
  {
    id: "dark",
    label: "Тёмная",
    emoji: "🌙",
    vars: {
      "--background": "224 30% 4%",
      "--foreground": "210 40% 96%",
      "--card": "224 28% 7%",
      "--primary": "263 90% 68%",
      "--muted": "224 24% 10%",
      "--border": "224 24% 13%",
    },
  },
  {
    id: "light",
    label: "Светлая",
    emoji: "☀️",
    vars: {
      "--background": "0 0% 98%",
      "--foreground": "222 47% 8%",
      "--card": "0 0% 100%",
      "--primary": "263 90% 58%",
      "--muted": "220 14% 94%",
      "--border": "220 14% 88%",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🔵",
    preview: "from-blue-950 to-slate-950",
    vars: {
      "--background": "220 40% 4%",
      "--foreground": "214 100% 95%",
      "--card": "220 35% 8%",
      "--primary": "210 100% 60%",
      "--muted": "220 30% 10%",
      "--border": "220 30% 14%",
    },
  },
  {
    id: "forest",
    label: "Forest",
    emoji: "🌿",
    preview: "from-emerald-950 to-green-950",
    vars: {
      "--background": "150 30% 4%",
      "--foreground": "140 40% 95%",
      "--card": "150 25% 7%",
      "--primary": "142 70% 50%",
      "--muted": "150 20% 10%",
      "--border": "150 20% 13%",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    emoji: "🌅",
    preview: "from-orange-950 to-rose-950",
    vars: {
      "--background": "15 30% 4%",
      "--foreground": "30 40% 96%",
      "--card": "15 25% 7%",
      "--primary": "25 95% 60%",
      "--muted": "15 20% 10%",
      "--border": "15 20% 13%",
    },
  },
  {
    id: "rose",
    label: "Rose",
    emoji: "🌸",
    preview: "from-pink-950 to-rose-950",
    vars: {
      "--background": "340 25% 4%",
      "--foreground": "340 30% 96%",
      "--card": "340 20% 7%",
      "--primary": "340 80% 65%",
      "--muted": "340 15% 10%",
      "--border": "340 15% 13%",
    },
  },
] as const;

type ThemeId = typeof THEMES[number]["id"];

function applyTheme(id: ThemeId) {
  const theme = THEMES.find((t) => t.id === id);
  if (!theme) return;
  const root = document.documentElement;

  // Снимаем предыдущую тему перед применением новой.
  THEMES.forEach((t) => root.classList.remove(`theme-${t.id}`));
  root.classList.add(`theme-${id}`);

  // Переключаем класс `dark`, чтобы Tailwind корректно применил палитру.
  if (id === "light") {
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
  }

  // Обновляем CSS-переменные выбранной темы.
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  localStorage.setItem("mediateka-theme", id);
}

function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ThemeId>("dark");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("mediateka-theme") as ThemeId | null;
    if (saved) { setCurrent(saved); applyTheme(saved); }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (id: ThemeId) => {
    setCurrent(id);
    applyTheme(id);
    setOpen(false);
  };

  const currentTheme = THEMES.find((t) => t.id === current) ?? THEMES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Сменить тему"
        className={cn(
          "text-muted-foreground hover:text-foreground border border-border/70 hover:border-border w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm focus-ring",
          open && "border-primary/40 text-foreground bg-primary/10 shadow-glow-sm"
        )}
      >
        {currentTheme.emoji}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-card/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50 p-3 min-w-[200px] animate-fade-in-scale">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Тема оформления</p>
          <div className="space-y-1">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all focus-ring",
                  current === theme.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span className="text-base">{theme.emoji}</span>
                <span className="font-medium">{theme.label}</span>
                <div className="ml-auto flex gap-1">
                  <div
                    className="w-3 h-3 rounded-full border border-border/70"
                    style={{ background: `hsl(${theme.vars["--primary"]})` }}
                  />
                  <div
                    className="w-3 h-3 rounded-full border border-border/70"
                    style={{ background: `hsl(${theme.vars["--background"]})` }}
                  />
                </div>
                {current === theme.id && <span className="text-primary text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardTopbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pageTitle = PAGE_TITLES[pathname] ?? "";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((x) => typeof x === "string").slice(0, RECENT_SEARCHES_MAX));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  }, [pathname]);

  const pushRecent = (q: string) => {
    const cleaned = q.trim();
    if (cleaned.length < 2) return;
    setRecentSearches((prev) => {
      const next = [cleaned, ...prev.filter((x) => x !== cleaned)].slice(0, RECENT_SEARCHES_MAX);
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=6`);
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border/60 backdrop-blur-xl bg-background/70 flex items-center px-4 sm:px-6 gap-4">
      <div className="flex-shrink-0 hidden sm:block">
        <h2 className="font-display font-semibold text-foreground/80 text-sm">{pageTitle}</h2>
      </div>

      <div ref={searchRef} className="flex-1 max-w-lg mx-auto relative">
        <div
          onClick={() => { setSearchOpen(true); inputRef.current?.focus(); }}
          className={cn(
            "flex items-center gap-2 border rounded-xl px-3 py-1.5 cursor-text transition-all duration-200 bg-card/40 backdrop-blur-md",
            searchOpen ? "border-primary/40 shadow-glow-sm" : "border-border/70 hover:border-primary/20"
          )}
        >
          <span className="text-muted-foreground text-sm">🔍</span>
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim().length >= 2) {
                setSearchOpen(false);
                pushRecent(searchQuery);
                router.push(`/dashboard?q=${encodeURIComponent(searchQuery.trim())}`);
                setSearchQuery("");
              }
            }}
            placeholder="Поиск... (Ctrl+K)"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus-ring rounded-lg"
          />
          {searching && <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />}
        </div>

        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-border shadow-2xl z-50 overflow-hidden bg-card/90 backdrop-blur-xl">
            {searchQuery.length < 2 ? (
              <div className="p-2">
                {recentSearches.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground">Недавние запросы</p>
                    <div className="space-y-1">
                      {recentSearches.slice(0, 6).map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            setSearchOpen(false);
                            pushRecent(q);
                            router.push(`/dashboard?q=${encodeURIComponent(q)}`);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-primary/10 transition-colors text-left focus-ring"
                        >
                          <span className="text-sm">🕘</span>
                          <span className="text-sm text-foreground truncate">{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground">Быстрые переходы</p>
                  <div className="grid grid-cols-2 gap-1.5 p-1">
                    {QUICK_LINKS.map((l) => (
                      <button
                        key={l.href}
                        onClick={() => { setSearchOpen(false); router.push(l.href); }}
                        className="flex items-center gap-2 px-2 py-2 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-muted/40 transition-all text-left focus-ring"
                      >
                        <span className="text-sm">{l.icon}</span>
                        <span className="text-xs font-medium text-foreground/90 truncate">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="p-2 space-y-1">
                  {searchResults.map((r, i) => (
                    <div key={i}
                      onClick={() => {
                        setSearchOpen(false);
                        pushRecent(r.title);
                        setSearchQuery("");
                        router.push(`/dashboard?q=${encodeURIComponent(r.title)}&type=${r.type}`);
                      }}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-primary/10 cursor-pointer transition-colors group">
                      <div className="w-8 h-12 rounded-md overflow-hidden bg-muted/50 flex-shrink-0">
                        {r.posterUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={r.posterUrl} alt={r.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-sm">{MEDIA_TYPE_ICONS[r.type]}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{MEDIA_TYPE_ICONS[r.type]} {r.year ?? ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-2">
                  <button
                    onClick={() => { setSearchOpen(false); pushRecent(searchQuery); router.push(`/dashboard?q=${encodeURIComponent(searchQuery)}`); }}
                    className="w-full text-xs text-muted-foreground hover:text-primary text-left px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-colors focus-ring">
                    Все результаты для «{searchQuery}» →
                  </button>
                </div>
              </>
            ) : !searching ? (
              <div className="p-5 text-center text-sm text-muted-foreground">Ничего не найдено</div>
            ) : (
              <div className="p-5 text-center">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <NotificationsBell />
        <ThemePicker />
      </div>
    </header>
  );
}