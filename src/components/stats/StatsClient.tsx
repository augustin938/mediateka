"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  avgRating: string | null;
  ratingDist: { rating: number; count: number }[];
  topGenres: { name: string; count: number }[];
  activityByMonth: { key: string; label: string; added: number; completed: number }[];
  completedByType: Record<string, number>;
  recentCompleted: { title: string; type: string; posterUrl: string | null; rating: number | null; completedAt: string }[];
  totalRated: number;
  totalCompleted: number;
}

const STATUS_COLORS: Record<string, string> = {
  WANT: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#10b981",
  DROPPED: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  WANT: "Хочу",
  IN_PROGRESS: "В процессе",
  COMPLETED: "Завершено",
  DROPPED: "Брошено",
};
const TYPE_COLORS = { movie: "#8b5cf6", book: "#f59e0b", game: "#10b981" };
const TYPE_LABELS: Record<string, string> = { movie: "Фильмы", book: "Книги", game: "Игры" };
const TYPE_ICONS: Record<string, string> = { movie: "🎬", book: "📚", game: "🎮" };

const CHART_COLORS = ["#8b5cf6","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4","#84cc16"];

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: string }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="font-display text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs border border-border shadow-xl">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// Основной экспортируемый компонент файла.
export default function StatsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return <div className="text-center text-muted-foreground py-20">Ошибка загрузки</div>;

  if (stats.total === 0) {
    return (
      <div className="text-center py-20 space-y-4 text-muted-foreground">
        <div className="text-6xl">📊</div>
        <p className="text-xl font-medium text-foreground">Статистика пуста</p>
        <p className="text-sm">Добавь что-нибудь в коллекцию чтобы увидеть статистику</p>
        <a href="/dashboard" className="inline-block text-sm text-primary hover:underline mt-2">Найти что-нибудь →</a>
      </div>
    );
  }

  const statusData = Object.entries(stats.byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k], value: v, color: STATUS_COLORS[k] }));

  const typeData = Object.entries(stats.byType)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: TYPE_LABELS[k], value: v, color: TYPE_COLORS[k as keyof typeof TYPE_COLORS] }));

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Всего в коллекции" value={stats.total} icon="📚" sub="медиа добавлено" />
        <StatCard label="Завершено" value={stats.totalCompleted} icon="✅" sub={`${Math.round(stats.totalCompleted / stats.total * 100)}% от коллекции`} />
        <StatCard label="Средняя оценка" value={stats.avgRating ? `${stats.avgRating}/10` : "—"} icon="⭐" sub={`${stats.totalRated} оценок`} />
        <StatCard label="В процессе" value={stats.byStatus.IN_PROGRESS} icon="▶️" sub="сейчас читаю/смотрю/играю" />
      </div>

      {/* By type cards */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(stats.byType).map(([type, count]) => (
          <div key={type} className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{TYPE_ICONS[type]}</span>
              <span className="text-sm font-medium text-muted-foreground">{TYPE_LABELS[type]}</span>
            </div>
            <p className="font-display text-2xl font-bold">{count}</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Завершено</span>
                <span className="text-emerald-400">{stats.completedByType[type]}</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-1.5">
                <div className="bg-emerald-400 h-1.5 rounded-full transition-all"
                  style={{ width: count > 0 ? `${Math.round(stats.completedByType[type] / count * 100)}%` : "0%" }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity chart */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg">Активность по месяцам</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.activityByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="added" name="Добавлено" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="completed" name="Завершено" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status pie */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg">По статусам</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-shrink-0">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-sm">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-semibold ml-auto pl-3">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rating distribution */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg">Распределение оценок</h2>
          {stats.totalRated === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Нет оценок</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.ratingDist} barSize={18}>
                <XAxis dataKey="rating" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Оценок" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top genres */}
      {stats.topGenres.length > 0 && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg">Топ жанры</h2>
          <div className="space-y-2">
            {stats.topGenres.map((g, i) => (
              <div key={g.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <span className="text-sm flex-1 text-foreground">{g.name}</span>
                <div className="flex-1 max-w-48 bg-muted/30 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.round(g.count / stats.topGenres[0].count * 100)}%`,
                      background: CHART_COLORS[i % CHART_COLORS.length]
                    }} />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right">{g.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent completed */}
      {stats.recentCompleted.length > 0 && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg">Недавно завершено</h2>
          <div className="space-y-3">
            {stats.recentCompleted.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0">
                  {item.posterUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg">{TYPE_ICONS[item.type]}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{TYPE_ICONS[item.type]} {TYPE_LABELS[item.type]}</p>
                </div>
                {item.rating && (
                  <span className="text-xs text-amber-400 flex-shrink-0">★ {item.rating}/10</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}