"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Поиск",
  "/recommendations": "Для тебя",
  "/collection": "Коллекция",
  "/activity": "История",
  "/achievements": "Достижения",
  "/friends": "Друзья",
  "/random": "Сегодня",
  "/stats": "Статистика",
  "/profile": "Профиль",
};

export default function DashboardTopbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pageTitle = PAGE_TITLES[pathname] ?? "";

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset on route change
  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  }, [pathname]);

  // Ctrl+K
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

  // Debounced search
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
    <header className="sticky top-0 z-30 h-14 border-b border-white/5 backdrop-blur-xl bg-background/80 flex items-center px-4 sm:px-6 gap-4">
      {/* Page title */}
      <div className="flex-shrink-0 hidden sm:block">
        <h2 className="font-display font-semibold text-foreground/80 text-sm">{pageTitle}</h2>
      </div>

      {/* Search bar — center */}
      <div ref={searchRef} className="flex-1 max-w-lg mx-auto relative">
        <div
          onClick={() => { setSearchOpen(true); inputRef.current?.focus(); }}
          className={cn(
            "flex items-center gap-2 border rounded-xl px-3 py-1.5 cursor-text transition-all duration-200",
            searchOpen ? "border-primary/40 bg-background" : "border-border bg-muted/20 hover:border-primary/20"
          )}
        >
          <span className="text-muted-foreground text-sm">🔍</span>
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Поиск... (Ctrl+K)"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
          {searching && <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />}
        </div>

        {/* Results dropdown */}
        {searchOpen && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-border shadow-2xl z-50 overflow-hidden"
            style={{ background: "var(--background)" }}>
            {searchResults.length > 0 ? (
              <>
                <div className="p-2 space-y-1">
                  {searchResults.map((r, i) => (
                    <div key={i}
                      onClick={() => {
                        setSearchOpen(false);
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
                  <button onClick={() => { setSearchOpen(false); router.push(`/dashboard?q=${encodeURIComponent(searchQuery)}`); }}
                    className="w-full text-xs text-muted-foreground hover:text-primary text-left px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                    Все результаты для «{searchQuery}» →
                  </button>
                </div>
              </>
            ) : !searching ? (
              <div className="p-5 text-center text-sm text-muted-foreground">Ничего не найдено</div>
            ) : null}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <NotificationsBell />
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground border border-white/10 hover:border-white/20 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          suppressHydrationWarning
        >
          {typeof window === "undefined" ? "🌙" : theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}