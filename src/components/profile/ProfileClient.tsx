"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatLocalDateKey, formatRuShortDate } from "@/lib/date";
import type { QuizResult } from "@/types";

interface CollectionEntry {
  collectionItemId: string;
  mediaItemId: string;
  title: string;
  posterUrl: string | null;
  type: string;
  year: number | null;
  rating: number | null;
  status: string;
}

interface Props {
  user: { id: string; name: string; email: string; image: string | null };
  stats: {
    total: number; completed: number; inProgress: number; want: number;
    movies: number; books: number; games: number; avgRating: string | null;
  };
  activityByDay: Record<string, number>;
  collection: CollectionEntry[];
  initialPinnedIds: string[];
  quizHistory: QuizResult[];
}

const TYPE_ICONS: Record<string, string> = { movie: "🎬", book: "📚", game: "🎮" };

const CAT_LABELS: Record<string, string> = { all: "Всё", movie: "Фильмы", book: "Книги", game: "Игры" };
const MODE_LABELS: Record<string, string> = { classic: "🎯 Классик", endless: "♾️ Бесконечный" };
const TIER_THRESHOLDS = [
  { min: 90, label: "🏆 Легенда",  color: "text-amber-400" },
  { min: 70, label: "🥇 Эксперт",  color: "text-yellow-400" },
  { min: 50, label: "🎓 Знаток",   color: "text-green-400" },
  { min: 30, label: "📚 Любитель", color: "text-blue-400" },
  { min: 0,  label: "🌱 Новичок",  color: "text-muted-foreground" },
];
function getTier(correctAnswers: number, total: number) {
  const pct = total > 0 ? (correctAnswers / total) * 100 : 0;
  return TIER_THRESHOLDS.find((t) => pct >= t.min) ?? TIER_THRESHOLDS.at(-1)!;
}

function Avatar({ image, name, size = 96 }: { image: string | null; name: string; size?: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} className="w-full h-full object-cover" />;
  }
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/40 to-violet-600/40 text-white font-display font-bold"
      style={{ fontSize: size / 3 }}>
      {initials}
    </div>
  );
}

function ActivityCalendar({ activityByDay }: { activityByDay: Record<string, number> }) {
  const today = new Date();
  const weeks: { date: Date; count: number }[][] = [];

  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);

  let week: { date: Date; count: number }[] = [];
  const cur = new Date(start);
  while (cur <= today || week.length > 0) {
    const dateStr = formatLocalDateKey(cur);
    const isFuture = cur > today;
    week.push({ date: new Date(cur), count: isFuture ? -1 : (activityByDay[dateStr] ?? 0) });
    if (week.length === 7) { weeks.push(week); week = []; }
    cur.setDate(cur.getDate() + 1);
    if (cur > today && week.length === 0) break;
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({ date: new Date(cur), count: -1 });
    weeks.push(week);
  }

  const totalActive = Object.keys(activityByDay).length;
  const totalActions = Object.values(activityByDay).reduce((s, v) => s + v, 0);

  const getColor = (count: number) => {
    if (count < 0) return "bg-transparent";
    if (count === 0) return "bg-muted/30";
    if (count === 1) return "bg-primary/30";
    if (count <= 3) return "bg-primary/50";
    if (count <= 6) return "bg-primary/70";
    return "bg-primary";
  };

  const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
  const DAYS = ["Пн", "", "Ср", "", "Пт", "", ""];

  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, wi) => {
    const firstDay = week.find((d) => d.count >= 0);
    if (firstDay && firstDay.date.getDate() <= 7) {
      const m = firstDay.date.getMonth();
      if (!monthLabels.length || monthLabels[monthLabels.length - 1].label !== MONTHS[m]) {
        monthLabels.push({ label: MONTHS[m], col: wi });
      }
    }
  });

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground">Активность</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{totalActions} действий</span>
          <span>·</span>
          <span>{totalActive} дней</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="relative mb-1 ml-8 h-4">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="absolute text-xs text-muted-foreground"
                style={{ left: `${m.col * 13}px` }}
              >
                {m.label}
              </div>
            ))}
          </div>
          <div className="flex gap-0.5">
            <div className="flex flex-col gap-0.5 mr-1.5">
              {DAYS.map((d, i) => (
                <div key={i} className="h-[11px] text-[9px] text-muted-foreground leading-[11px] text-right pr-1 w-6">{d}</div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div key={di}
                    title={day.count >= 0 ? `${day.date.toLocaleDateString("ru")} — ${day.count} действий` : ""}
                    className={cn("w-[11px] h-[11px] rounded-[2px] transition-colors", getColor(day.count))} />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-2 justify-end">
            <span className="text-[10px] text-muted-foreground">Меньше</span>
            {[0, 1, 3, 5, 7].map((v) => (
              <div key={v} className={cn("w-[11px] h-[11px] rounded-[2px]", getColor(v))} />
            ))}
            <span className="text-[10px] text-muted-foreground">Больше</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PinnedMedia({ collection, initialPinnedIds }: { collection: CollectionEntry[]; initialPinnedIds: string[] }) {
  const [pinnedIds, setPinnedIds] = useState<string[]>(initialPinnedIds);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const pinnedItems = pinnedIds
    .map((id) => collection.find((c) => c.collectionItemId === id))
    .filter(Boolean) as CollectionEntry[];

  const filteredCollection = collection.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/pinned", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedItems: pinnedIds }),
      });
      if (!res.ok) throw new Error();
      toast.success("Закреплённые сохранены");
      setEditing(false);
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground">📌 Закреплённые</h3>
        <button onClick={() => setEditing((e) => !e)}
          className={cn("text-xs px-3 py-1.5 rounded-lg border transition-all",
            editing ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30")}>
          {editing ? "Отмена" : "✏️ Изменить"}
        </button>
      </div>

      {!editing && (
        <div className="grid grid-cols-3 gap-3">
          {pinnedItems.length === 0 && (
            <div className="col-span-3 text-center py-6 text-muted-foreground text-sm">
              <p className="text-2xl mb-2">📌</p>
              <p>Нет закреплённых</p>
              <p className="text-xs mt-1">Нажми «Изменить» чтобы выбрать до 3 любимых</p>
            </div>
          )}
          {pinnedItems.map((item) => (
            <div key={item.collectionItemId} className="group relative rounded-xl overflow-hidden bg-muted/30" style={{ aspectRatio: "2/3" }}>
              {item.posterUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl bg-muted/50">
                    {TYPE_ICONS[item.type] ?? "🎬"}
                  </div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{item.title}</p>
                {item.year && <p className="text-white/60 text-[10px]">{item.year}</p>}
                {item.rating && <p className="text-amber-400 text-[10px] font-bold">★ {item.rating}/10</p>}
              </div>
            </div>
          ))}
          {Array.from({ length: 3 - pinnedItems.length }).map((_, i) => (
            <div key={i} className="rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground/30 text-2xl"
              style={{ aspectRatio: "2/3" }}>
              +
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Выбрано: {pinnedIds.length}/3</p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по коллекции..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
          />
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {filteredCollection.map((item) => {
              const selected = pinnedIds.includes(item.collectionItemId);
              const disabled = !selected && pinnedIds.length >= 3;
              return (
                <button key={item.collectionItemId}
                  onClick={() => !disabled && toggle(item.collectionItemId)}
                  disabled={disabled}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all border",
                    selected ? "bg-primary/20 border-primary/30 text-foreground" : "border-transparent hover:bg-muted/30 text-foreground",
                    disabled && "opacity-40 cursor-not-allowed"
                  )}>
                  <div className="w-8 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted/50">
                    {item.posterUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-sm">{TYPE_ICONS[item.type]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.year} · {TYPE_ICONS[item.type]}</p>
                  </div>
                  {selected && <span className="text-primary text-sm flex-shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
          <button onClick={save} disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      )}
    </div>
  );
}

function QuizHistory({ results }: { results: QuizResult[] }) {
  if (results.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 space-y-3">
        <h3 className="font-display font-semibold text-foreground">🎮 Квиз</h3>
        <div className="text-center py-6 text-muted-foreground space-y-2">
          <p className="text-2xl">🎯</p>
          <p className="text-sm">Ты ещё не проходил квиз</p>
          <a href="/quiz" className="text-xs text-primary hover:underline">Попробовать →</a>
        </div>
      </div>
    );
  }

  const bestClassic = results
    .filter((r) => r.mode === "classic")
    .reduce((best, r) => {
      const pct = r.total > 0 ? Math.round((r.correctAnswers / r.total) * 100) : 0;
      return pct > best ? pct : best;
    }, 0);
  const bestEndless  = results.filter((r) => r.mode === "endless").reduce((b, r) => r.points > b ? r.points : b, 0);
  const totalGames   = results.length;
  const bestStreak   = results.reduce((b, r) => r.streak > b ? r.streak : b, 0);

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground">🎮 Квиз</h3>
        <a href="/quiz"
          className="text-xs text-primary hover:text-primary/80 border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-all">
          Играть →
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Игр сыграно",    value: totalGames,           icon: "🎯" },
          { label: "Лучшая серия",   value: `${bestStreak}`,      icon: "🔥" },
          { label: "Лучший классик", value: `${bestClassic}%`,    icon: "🏆" },
          { label: "Рекорд endless", value: `${bestEndless} оч.`, icon: "♾️" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/30 rounded-xl p-3 text-center">
            <p className="text-lg">{s.icon}</p>
            <p className="font-bold text-foreground text-sm">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Последние игры</p>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {results.slice(0, 10).map((r) => {
            const pct  = r.total > 0 ? Math.round((r.correctAnswers / r.total) * 100) : 0;
            const tier = getTier(r.correctAnswers, r.total);
            const date = formatRuShortDate(new Date(r.createdAt));
            return (
              <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 border border-border/30">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-muted/40 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-foreground leading-none">{r.mode === "classic" ? r.correctAnswers : r.points}</span>
                  <span className="text-[9px] text-muted-foreground leading-none">{r.mode === "classic" ? `/${r.total}` : "оч."}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{MODE_LABELS[r.mode] ?? r.mode}</span>
                    {r.category !== "all" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                        {CAT_LABELS[r.category] ?? r.category}
                      </span>
                    )}
                    {r.streak >= 3 && <span className="text-[10px] text-orange-400">🔥 {r.streak}</span>}
                    {r.mode === "endless" && (
                      <span className="text-[10px] text-amber-400">⭐ {r.points}</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex-shrink-0 text-right space-y-0.5">
                  <p className={cn("text-xs font-semibold", tier.color)}>{tier.label.split(" ")[0]}</p>
                  <p className="text-[10px] text-muted-foreground">{date}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ProfileClient({ user, stats, activityByDay, collection, initialPinnedIds, quizHistory }: Props) {
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState<string | null>(user.image);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Файл слишком большой. Максимум 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!name.trim()) { toast.error("Имя не может быть пустым"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, image }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Ошибка сохранения"); return; }
      toast.success("Профиль обновлён");
      window.dispatchEvent(new Event("profile-updated"));
    } catch { toast.error("Ошибка сохранения"); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Пароли не совпадают"); return; }
    if (newPassword.length < 8) { toast.error("Пароль должен быть не менее 8 символов"); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Ошибка"); return; }
      toast.success("Пароль изменён");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch { toast.error("Ошибка"); }
    finally { setSavingPassword(false); }
  };

  const exportCSV = () => { window.open("/api/profile/export", "_blank"); toast.success("Экспорт начат"); };

  return (
    <div className="space-y-6">
      <ActivityCalendar activityByDay={activityByDay} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-primary/30">
                <Avatar image={image} name={name} size={96} />
              </div>
              <button onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                📷 Сменить
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-lg text-foreground">{name || "—"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <PinnedMedia collection={collection} initialPinnedIds={initialPinnedIds} />

          <div className="glass rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Статистика</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Всего", value: stats.total, icon: "📦" },
                { label: "Завершено", value: stats.completed, icon: "✅" },
                { label: "В процессе", value: stats.inProgress, icon: "▶️" },
                { label: "Хочу", value: stats.want, icon: "🔖" },
                { label: "Фильмы", value: stats.movies, icon: "🎬" },
                { label: "Книги", value: stats.books, icon: "📚" },
                { label: "Игры", value: stats.games, icon: "🎮" },
                { label: "Ср. оценка", value: stats.avgRating ? `${stats.avgRating}/10` : "—", icon: "⭐" },
              ].map((s) => (
                <div key={s.label} className="bg-muted/30 rounded-xl p-3 text-center">
                  <p className="text-lg">{s.icon}</p>
                  <p className="font-bold text-foreground text-sm">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5 space-y-3">
            <h3 className="font-display font-semibold text-foreground">Данные</h3>
            <p className="text-sm text-muted-foreground">Экспортируй всю коллекцию в CSV для Excel или Google Sheets</p>
            <button onClick={exportCSV}
              className="w-full flex items-center justify-center gap-2 text-sm border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-xl transition-all">
              📥 Скачать CSV
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            {[{ id: "info", label: "👤 Основное" }, { id: "password", label: "🔒 Пароль" }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={cn("text-sm px-4 py-2 rounded-xl border transition-all font-medium",
                  activeTab === tab.id ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30")}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "info" && (
            <div className="glass rounded-2xl p-6 space-y-5 animate-fade-in">
              <h3 className="font-display font-semibold text-foreground">Основная информация</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Имя</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Твоё имя"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Email</label>
                <input value={user.email} disabled
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed" />
                <p className="text-xs text-muted-foreground/60">Email изменить нельзя</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Аватар</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden ring-1 ring-border flex-shrink-0">
                    <Avatar image={image} name={name} size={64} />
                  </div>
                  <div className="space-y-2 flex-1">
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full text-sm border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl transition-all">
                      📷 Загрузить фото
                    </button>
                    {image && (
                      <button onClick={() => setImage(null)}
                        className="w-full text-sm border border-red-500/20 hover:border-red-500/40 text-red-400 px-4 py-2 rounded-xl transition-all">
                        🗑 Удалить аватар
                      </button>
                    )}
                    <p className="text-xs text-muted-foreground/60">JPG, PNG до 2MB</p>
                  </div>
                </div>
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
                {saving ? "Сохраняем..." : "Сохранить изменения"}
              </button>
            </div>
          )}

          {activeTab === "password" && (
            <div className="glass rounded-2xl p-6 space-y-5 animate-fade-in">
              <h3 className="font-display font-semibold text-foreground">Смена пароля</h3>
              {[
                { label: "Текущий пароль", value: currentPassword, onChange: setCurrentPassword, placeholder: "••••••••" },
                { label: "Новый пароль", value: newPassword, onChange: setNewPassword, placeholder: "Минимум 8 символов" },
                { label: "Подтвердить пароль", value: confirmPassword, onChange: setConfirmPassword, placeholder: "Повтори новый пароль" },
              ].map((field) => (
                <div key={field.label} className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">{field.label}</label>
                  <input type="password" value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder={field.placeholder}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/50" />
                </div>
              ))}
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-400">Пароли не совпадают</p>
              )}
              <button onClick={savePassword} disabled={savingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
                {savingPassword ? "Меняем..." : "Изменить пароль"}
              </button>
            </div>
          )}

          <QuizHistory results={quizHistory} />
        </div>
      </div>
    </div>
  );
}