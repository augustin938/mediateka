"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MEDIA_TYPE_ICONS, STATUS_LABELS, STATUS_COLORS } from "@/types";
import type { CollectionItemWithMedia } from "@/types";
import AchievementsClient from "@/components/achievements/AchievementsClient";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface Friendship {
  id: string;
  status: string;
  requesterId: string;
  addresseeId: string;
}

interface Props {
  profileUser: ProfileUser;
  currentUserId: string;
  friendship: Friendship | null;
  collection: CollectionItemWithMedia[];
  isFriend: boolean;
}

function Avatar({ image, name }: { image?: string | null; name: string }) {
  const initials = name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  if (image) return <img src={image} alt={name} className="w-full h-full object-cover" />;
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-violet-600/30 text-white font-bold text-xl">
      {initials}
    </div>
  );
}

// Основной экспортируемый компонент файла.
export default function UserProfileClient({ profileUser, currentUserId, friendship, collection, isFriend }: Props) {
  const [currentFriendship, setCurrentFriendship] = useState(friendship);
  const [filter, setFilter] = useState<"all" | "movie" | "book" | "game">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(() => new Set());
  const [ownedMediaItemIds, setOwnedMediaItemIds] = useState<Set<string>>(() => new Set());
  const [achOpen, setAchOpen] = useState(false);
  const [achLoading, setAchLoading] = useState(false);
  const [achStats, setAchStats] = useState<any | null>(null);

  useEffect(() => {
    if (!isFriend) return;
    const mediaItemIds = Array.from(new Set(collection.map((i) => i.mediaItem?.id).filter(Boolean)));
    if (mediaItemIds.length === 0) return;
    fetch("/api/collection/contains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaItemIds }),
    })
      .then((r) => r.json())
      .then((d) => setOwnedMediaItemIds(new Set(d.ownedMediaItemIds ?? [])))
      .catch(() => {});
  }, [isFriend, collection]);

  const sendRequest = async () => {
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresseeId: profileUser.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setCurrentFriendship(data.friendship);
      toast.success("Заявка отправлена!");
    } else {
      toast.error("Ошибка отправки заявки");
    }
  };

  const filtered = collection.filter((item) => {
    if (filter !== "all" && item.mediaItem.type !== filter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: collection.length,
    completed: collection.filter((i) => i.status === "COMPLETED").length,
    movies: collection.filter((i) => i.mediaItem.type === "movie").length,
    books: collection.filter((i) => i.mediaItem.type === "book").length,
    games: collection.filter((i) => i.mediaItem.type === "game").length,
  };

  const friendshipStatus = currentFriendship?.status;
  const isPending = friendshipStatus === "pending";
  const isAccepted = friendshipStatus === "accepted";
  const iRequested = currentFriendship?.requesterId === currentUserId;

  const removeFriend = async () => {
    if (!currentFriendship?.id) return;
    const res = await fetch(`/api/friends/${currentFriendship.id}`, { method: "DELETE" });
    if (res.ok) {
      setCurrentFriendship(null);
      toast.success("Друг удалён");
    } else {
      toast.error("Не удалось удалить из друзей");
    }
  };

  const importToMyCollection = async (item: CollectionItemWithMedia) => {
    const media = item.mediaItem as any;
    setImportingId(item.id);
    try {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaItemId: media.id,
          status: "WANT",
          externalId: media.externalId,
          type: media.type,
          title: media.title,
          originalTitle: media.originalTitle ?? null,
          description: media.description ?? null,
          posterUrl: media.posterUrl ?? null,
          year: media.year ?? null,
          genres: media.genres ?? [],
          externalRating: media.externalRating ?? null,
          externalUrl: media.externalUrl ?? null,
          director: media.director ?? null,
          author: media.author ?? null,
          developer: media.developer ?? null,
        }),
      });

      if (res.status === 409) {
        toast.info("Уже есть в твоей коллекции");
        setImportedIds((prev) => new Set(prev).add(item.id));
        return;
      }
      if (!res.ok) throw new Error();

      const data = await res.json();
      const createdId = data.item?.id as string | undefined;
      toast.success("Добавлено в твою коллекцию");
      setImportedIds((prev) => new Set(prev).add(item.id));

      if (createdId) {
        toast("Можно отменить действие", {
          description: "Элемент добавлен в твою коллекцию",
          action: {
            label: "Отменить",
            onClick: async () => {
              try {
                const del = await fetch(`/api/collection/${createdId}`, { method: "DELETE" });
                if (!del.ok) throw new Error();
                setImportedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(item.id);
                  return next;
                });
                toast.success("Отменено");
              } catch {
                toast.error("Не удалось отменить");
              }
            },
          },
        } as any);
      }
    } catch {
      toast.error("Не удалось добавить в коллекцию");
    } finally {
      setImportingId(null);
    }
  };

  const filteredImported = useMemo(() => {
    // на клиенте нет знания о твоей коллекции, поэтому считаем "импортировано" только в рамках текущей сессии
    return importedIds;
  }, [importedIds]);

  const owned = useMemo(() => ownedMediaItemIds, [ownedMediaItemIds]);

  const openAchievements = async () => {
    if (!isFriend) return;
    setAchOpen(true);
    if (achStats) return;
    setAchLoading(true);
    try {
      const res = await fetch(`/api/users/${profileUser.id}/achievements`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAchStats(data.stats);
    } catch {
      toast.error("Не удалось загрузить достижения");
      setAchOpen(false);
    } finally {
      setAchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {achOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setAchOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div className="relative glass w-full sm:max-w-5xl max-h-[92vh] sm:max-h-[86vh] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-fade-in flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">Достижения — {profileUser.name}</p>
                <p className="text-xs text-muted-foreground">Прогресс и награды в Медиатеке</p>
              </div>
              <button className="w-9 h-9 rounded-xl border border-border/70 hover:bg-muted/40 transition-all focus-ring" onClick={() => setAchOpen(false)}>✕</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {achLoading || !achStats ? (
                <div className="text-center py-16 text-sm text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                  Загружаю...
                </div>
              ) : (
                <AchievementsClient stats={achStats} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile header */}
      <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-primary/20 flex-shrink-0">
          <Avatar image={profileUser.image} name={profileUser.name} />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">{profileUser.name}</h1>
          <div className="flex flex-wrap gap-4 mt-2">
            {[
              { icon: "📦", label: "Всего", value: stats.total },
              { icon: "✅", label: "Завершено", value: stats.completed },
              { icon: "🎬", label: "Фильмы", value: stats.movies },
              { icon: "📚", label: "Книги", value: stats.books },
              { icon: "🎮", label: "Игры", value: stats.games },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-sm font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.icon} {s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0">
          {isAccepted ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/friends?chat=${profileUser.id}&source=profile`}
                className="text-sm bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-4 py-2 rounded-xl transition-colors"
              >
                💬 Чат
              </Link>
              <button
                onClick={openAchievements}
                className="text-sm bg-amber-500/10 hover:bg-amber-500/15 text-amber-300 border border-amber-500/25 px-4 py-2 rounded-xl transition-colors"
                title="Посмотреть достижения"
              >
                🏆 Достижения
              </button>
              <details className="relative group">
                <summary className="list-none cursor-pointer text-sm text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 rounded-xl select-none">
                  ✓ Друг
                </summary>
                <div className="absolute right-0 mt-2 min-w-[180px] rounded-xl border border-border/70 bg-card/95 backdrop-blur-sm shadow-xl p-1 z-10">
                  <button
                    onClick={removeFriend}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    Удалить из друзей
                  </button>
                </div>
              </details>
            </div>
          ) : isPending && iRequested ? (
            <span className="text-sm text-amber-400 border border-amber-400/30 bg-amber-400/10 px-4 py-2 rounded-xl">
              ⏳ Заявка отправлена
            </span>
          ) : isPending && !iRequested ? (
            <span className="text-sm text-blue-400 border border-blue-400/30 bg-blue-400/10 px-4 py-2 rounded-xl">
              📨 Хочет дружить
            </span>
          ) : (
            <button onClick={sendRequest}
              className="text-sm bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-4 py-2 rounded-xl transition-colors">
              + Добавить в друзья
            </button>
          )}
        </div>
      </div>

      {/* Collection */}
      {!isFriend ? (
        <div className="text-center py-20 space-y-4 text-muted-foreground">
          <div className="text-6xl">🔒</div>
          <p className="text-lg font-medium text-foreground">Коллекция закрыта</p>
          <p className="text-sm">Добавь {profileUser.name} в друзья чтобы видеть коллекцию</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground">Коллекция</h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {(["all", "movie", "book", "game"] as const).map((t) => (
              <button key={t} onClick={() => setFilter(t)}
                className={cn("text-sm px-3 py-1.5 rounded-xl border transition-all",
                  filter === t ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30")}>
                {t === "all" ? "Все" : t === "movie" ? "🎬 Фильмы" : t === "book" ? "📚 Книги" : "🎮 Игры"}
              </button>
            ))}
            <div className="w-px bg-border mx-1" />
            {(["all", "WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("text-sm px-3 py-1.5 rounded-xl border transition-all",
                  statusFilter === s ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30")}>
                {s === "all" ? "Все статусы" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">Показано: <span className="text-foreground font-medium">{filtered.length}</span> из {collection.length}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className="glass rounded-xl overflow-hidden">
                <div className="aspect-[2/3] bg-muted/50 relative overflow-hidden">
                  {item.mediaItem.posterUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</div>}

                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                    <button
                      onClick={() => importToMyCollection(item)}
                      disabled={importingId === item.id || filteredImported.has(item.id) || owned.has(item.mediaItem.id)}
                      className={cn(
                        "w-full text-xs font-semibold px-3 py-2 rounded-xl transition-all border focus-ring",
                        filteredImported.has(item.id) || owned.has(item.mediaItem.id)
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-primary/25 hover:bg-primary/35 text-white border-white/10"
                      )}
                      title="Добавить к себе в коллекцию"
                    >
                      {owned.has(item.mediaItem.id)
                        ? "✓ Уже в твоей коллекции"
                        : filteredImported.has(item.id)
                          ? "✓ Уже добавлено"
                          : importingId === item.id
                            ? "Добавляю..."
                            : "+ В мою коллекцию"}
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs font-semibold font-display leading-tight line-clamp-2 text-foreground">{item.mediaItem.title}</p>
                  {item.mediaItem.year && <p className="text-xs text-muted-foreground">{item.mediaItem.year}</p>}
                  <span className={cn("inline-block text-xs px-2 py-0.5 rounded-md border", STATUS_COLORS[item.status])}>
                    {STATUS_LABELS[item.status]}
                  </span>
                  {item.rating && <p className="text-xs text-amber-400">★ {item.rating}/10</p>}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Ничего не найдено</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}