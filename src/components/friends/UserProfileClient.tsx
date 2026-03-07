"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MEDIA_TYPE_ICONS, STATUS_LABELS, STATUS_COLORS } from "@/types";
import type { CollectionItemWithMedia } from "@/types";

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

export default function UserProfileClient({ profileUser, currentUserId, friendship, collection, isFriend }: Props) {
  const [currentFriendship, setCurrentFriendship] = useState(friendship);
  const [filter, setFilter] = useState<"all" | "movie" | "book" | "game">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  return (
    <div className="space-y-6">
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
            <span className="text-sm text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 rounded-xl">
              ✓ Друг
            </span>
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