"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface FriendUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  friendshipId?: string | null;
  friendshipStatus?: string | null;
}

interface FriendEntry {
  id: string;
  status: string;
  requesterId: string;
  addresseeId: string;
  other: FriendUser;
}

function Avatar({ image, name, size = 40 }: { image?: string | null; name: string; size?: number }) {
  const initials = name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  if (image) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
  );
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-violet-600/30 text-white font-bold text-sm">
      {initials}
    </div>
  );
}

export default function FriendsClient({ currentUserId }: { currentUserId: string }) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"friends" | "search" | "requests">("friends");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/friends")
      .then((r) => r.json())
      .then((data) => {
        setFriends(data.friends ?? []);
        setIncoming(data.incoming ?? []);
        setOutgoing(data.outgoing ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((data) => setSearchResults(data.users ?? []))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendRequest = async (addresseeId: string) => {
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresseeId }),
    });
    if (res.ok) {
      toast.success("Заявка отправлена!");
      load();
      setSearchResults((prev) => prev.map((u) =>
        u.id === addresseeId ? { ...u, friendshipStatus: "pending" } : u
      ));
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Ошибка");
    }
  };

  const respondToRequest = async (friendshipId: string, status: "accepted" | "rejected") => {
    const res = await fetch(`/api/friends/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(status === "accepted" ? "Заявка принята!" : "Заявка отклонена");
      load();
    }
  };

  const removeFriend = async (friendshipId: string) => {
    await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
    toast.success("Друг удалён");
    load();
  };

  const tabs = [
    { id: "friends", label: "Друзья", count: friends.length },
    { id: "requests", label: "Заявки", count: incoming.length },
    { id: "search", label: "Найти", count: null },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("text-sm px-4 py-2 rounded-xl border transition-all font-medium flex items-center gap-2",
              activeTab === tab.id
                ? "bg-primary/20 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:border-primary/30")}>
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={cn("text-xs px-1.5 py-0.5 rounded-full",
                activeTab === tab.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Friends tab */}
      {activeTab === "friends" && (
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 skeleton rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded w-1/3" />
                  <div className="h-3 skeleton rounded w-1/4" />
                </div>
              </div>
            ))
          ) : friends.length === 0 ? (
            <div className="text-center py-20 space-y-4 text-muted-foreground">
              <div className="text-6xl">👥</div>
              <p className="text-lg font-medium text-foreground">Пока нет друзей</p>
              <p className="text-sm">Найди друзей по имени или email</p>
              <button onClick={() => setActiveTab("search")}
                className="inline-flex items-center gap-2 text-sm bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/30 transition-colors">
                🔍 Найти друзей
              </button>
            </div>
          ) : (
            friends.map((f) => (
              <div key={f.id} className="glass rounded-xl p-4 flex items-center gap-4 group">
                <Link href={`/user/${f.other.id}`} className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-transparent hover:ring-primary/30 transition-all">
                  <Avatar image={f.other.image} name={f.other.name} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/user/${f.other.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                    {f.other.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{f.other.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/user/${f.other.id}`}
                    className="text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-1.5 rounded-lg transition-colors">
                    Коллекция →
                  </Link>
                  <button onClick={() => removeFriend(f.id)}
                    className="text-xs text-muted-foreground hover:text-red-400 border border-border hover:border-red-400/30 px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Requests tab */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {incoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Входящие заявки</h3>
              {incoming.map((f) => (
                <div key={f.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <Avatar image={f.other.image} name={f.other.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{f.other.name}</p>
                    <p className="text-xs text-muted-foreground">{f.other.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => respondToRequest(f.id, "accepted")}
                      className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors">
                      ✓ Принять
                    </button>
                    <button onClick={() => respondToRequest(f.id, "rejected")}
                      className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                      ✕ Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {outgoing.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Исходящие заявки</h3>
              {outgoing.map((f) => (
                <div key={f.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <Avatar image={f.other.image} name={f.other.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{f.other.name}</p>
                    <p className="text-xs text-muted-foreground">{f.other.email}</p>
                  </div>
                  <span className="text-xs text-amber-400 border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 rounded-lg">
                    ⏳ Ожидает
                  </span>
                </div>
              ))}
            </div>
          )}

          {incoming.length === 0 && outgoing.length === 0 && (
            <div className="text-center py-20 text-muted-foreground space-y-2">
              <div className="text-5xl">📭</div>
              <p>Нет заявок в друзья</p>
            </div>
          )}
        </div>
      )}

      {/* Search tab */}
      {activeTab === "search" && (
        <div className="space-y-4">
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени или email..."
              className="w-full bg-background border border-border rounded-xl px-4 py-3 pl-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((u) => (
                <div key={u.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <Avatar image={u.image} name={u.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  {u.friendshipStatus === "accepted" ? (
                    <span className="text-xs text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 rounded-lg">✓ Друг</span>
                  ) : u.friendshipStatus === "pending" ? (
                    <span className="text-xs text-amber-400 border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 rounded-lg">⏳ Заявка</span>
                  ) : (
                    <button onClick={() => sendRequest(u.id)}
                      className="text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-1.5 rounded-lg transition-colors">
                      + Добавить
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <div className="text-4xl">🔍</div>
              <p>Никого не найдено по запросу «{searchQuery}»</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}