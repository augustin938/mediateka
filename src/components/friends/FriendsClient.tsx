"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: "text" | "share";
  text: string | null;
  sharedTitle: string | null;
  sharedType: "movie" | "book" | "game" | null;
  sharedYear: number | null;
  sharedPosterUrl: string | null;
  createdAt: string;
  deletedAt: string | null;
  deleted: boolean;
  reactions?: { emoji: string; count: number; mine: boolean }[];
};

// Универсальный аватар: фото пользователя или fallback с инициалами.
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

// Боковая панель чата с SSE-обновлениями, реакциями и шарингом медиа.
function ChatDrawer({
  open,
  onClose,
  meId,
  friend,
}: {
  open: boolean;
  onClose: () => void;
  meId: string;
  friend: FriendUser | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [ownedShareKeys, setOwnedShareKeys] = useState<Set<string>>(() => new Set());
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const friendId = friend?.id ?? null;

  // Прокручивает список сообщений к последнему элементу.
  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // Загружает историю переписки и отмечает shared-элементы, которые уже в коллекции.
  const loadMessages = useCallback(async () => {
    if (!friendId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/messages?with=${encodeURIComponent(friendId)}&limit=60`);
      const data = await res.json();
      setConversationId(data.conversation?.id ?? null);
      const rows: ChatMessage[] = (data.messages ?? []).slice().reverse();
      setMessages(rows);

      // Mark shared items that are already in my collection.
      const shares = rows
        .filter((m) => m.type === "share" && m.sharedTitle && m.sharedType)
        .map((m) => ({ type: m.sharedType!, title: m.sharedTitle!, year: m.sharedYear ?? null }));
      if (shares.length > 0) {
        fetch("/api/collection/contains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shares }),
        })
          .then((r) => r.json())
          .then((d) => setOwnedShareKeys(new Set(d.ownedShareKeys ?? [])))
          .catch(() => {});
      } else {
        setOwnedShareKeys(new Set());
      }

      setTimeout(scrollToBottom, 50);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  // Применяет входящие события из SSE (новое сообщение, удаление, реакции).
  const applyEvent = (payload: any) => {
    if (payload?.type === "message:new" && payload.message) {
      const msg = payload.message as ChatMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, deleted: Boolean((msg as any).deletedAt) }];
      });
      setTimeout(scrollToBottom, 50);
    }
    if (payload?.type === "message:deleted" && payload.messageId) {
      setMessages((prev) => prev.map((m) => m.id === payload.messageId ? { ...m, deleted: true, deletedAt: payload.deletedAt ?? new Date().toISOString(), text: null, sharedTitle: null, sharedType: null, sharedYear: null, sharedPosterUrl: null } : m));
    }
    if (payload?.type === "reaction:added" && payload.messageId && payload.emoji) {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== payload.messageId) return m;
        const reactions = [...(m.reactions ?? [])];
        const idx = reactions.findIndex((r) => r.emoji === payload.emoji);
        if (idx === -1) {
          reactions.push({ emoji: payload.emoji, count: 1, mine: payload.userId === meId });
        } else {
          reactions[idx] = {
            ...reactions[idx],
            count: reactions[idx].count + 1,
            mine: reactions[idx].mine || payload.userId === meId,
          };
        }
        return { ...m, reactions };
      }));
    }
    if (payload?.type === "reaction:removed" && payload.messageId && payload.emoji) {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== payload.messageId) return m;
        const reactions = [...(m.reactions ?? [])];
        const idx = reactions.findIndex((r) => r.emoji === payload.emoji);
        if (idx === -1) return m;
        const nextCount = reactions[idx].count - 1;
        if (nextCount <= 0) {
          reactions.splice(idx, 1);
        } else {
          reactions[idx] = {
            ...reactions[idx],
            count: nextCount,
            mine: payload.userId === meId ? false : reactions[idx].mine,
          };
        }
        return { ...m, reactions };
      }));
    }
  };

  // Переключает реакцию пользователя на сообщение.
  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Не удалось обновить реакцию");
    }
  };

  useEffect(() => {
    if (!open || !friendId) return;
    loadMessages();
  }, [open, friendId, loadMessages]);

  useEffect(() => {
    if (!open || !friendId) return;
    let active = true;
    const connect = () => {
      esRef.current?.close();
      const es = new EventSource(`/api/chat/stream?with=${encodeURIComponent(friendId)}`);
      es.addEventListener("chat", (e: MessageEvent) => {
        try { applyEvent(JSON.parse(e.data)); } catch {}
      });
      es.onerror = () => {
        es.close();
        if (!active) return;
        reconnectRef.current = setTimeout(connect, 1000);
      };
      esRef.current = es;
    };
    connect();
    return () => {
      active = false;
      esRef.current?.close();
      esRef.current = null;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    };
  }, [open, friendId]);

  // Отправляет текстовое сообщение и оптимистично добавляет его в локальный список.
  const send = async () => {
    if (!friendId) return;
    const t = text.trim();
    if (t.length < 1) return;
    setText("");
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: friendId, text: t }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        const msg = data.message as ChatMessage;
        setConversationId(data.conversation?.id ?? conversationId);
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, { ...msg, deleted: Boolean((msg as any).deletedAt) }]));
        setTimeout(scrollToBottom, 30);
      } else {
        toast.error("Не удалось отправить");
      }
    } catch {
      toast.error("Не удалось отправить");
    }
  };

  // Добавляет shared-контент из чата в коллекцию текущего пользователя.
  const addSharedToCollection = async (m: ChatMessage) => {
    if (m.type !== "share" || !m.sharedTitle || !m.sharedType) return;
    if (ownedShareKeys.has(`${m.sharedType}::${m.sharedTitle}::${m.sharedYear ?? ""}`) || ownedShareKeys.has(`${m.sharedType}::${m.sharedTitle}::`)) {
      toast.info("Уже есть в коллекции");
      return;
    }
    const mediaItemId = `chat_${m.sharedType}_${m.sharedTitle.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_").toLowerCase().slice(0, 40)}`;
    try {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaItemId,
          status: "WANT",
          externalId: mediaItemId,
          type: m.sharedType,
          title: m.sharedTitle,
          posterUrl: m.sharedPosterUrl ?? null,
          year: m.sharedYear ?? null,
          genres: [],
          externalUrl: null,
          description: null,
          originalTitle: null,
          externalRating: null,
          director: null,
          author: null,
          developer: null,
        }),
      });
      if (res.status === 409) toast.info("Уже есть в коллекции");
      else if (res.ok) {
        toast.success("Добавлено в коллекцию");
        setOwnedShareKeys((prev) => new Set(prev).add(`${m.sharedType}::${m.sharedTitle}::${m.sharedYear ?? ""}`));
      }
      else toast.error("Не удалось добавить");
    } catch {
      toast.error("Не удалось добавить");
    }
  };

  // Удаляет сообщение у всех участников текущего диалога.
  const deleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, { method: "DELETE" });
      if (!res.ok) toast.error("Не удалось удалить");
    } catch {
      toast.error("Не удалось удалить");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-background/85 backdrop-blur-xl border-l border-border/70 flex flex-col">
        <div className="h-14 px-4 flex items-center gap-3 border-b border-border/60">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
            <Avatar image={friend?.image} name={friend?.name ?? "?"} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{friend?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{friend?.email}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-border/70 hover:border-primary/30 hover:bg-muted/40 transition-all focus-ring">
            ✕
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && (
            <div className="text-center text-sm text-muted-foreground py-6">Загрузка…</div>
          )}
          {!loading && messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10 space-y-2">
              <div className="text-3xl">💬</div>
              <p>Напиши первое сообщение</p>
            </div>
          )}

          {messages.map((m) => {
            const mine = m.senderId === meId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 border",
                  mine ? "bg-primary/15 border-primary/20" : "bg-card/40 border-border/70",
                )}>
                  {m.deleted ? (
                    <p className="text-xs text-muted-foreground italic">Сообщение удалено</p>
                  ) : m.type === "share" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">📎 Поделился из коллекции</p>
                      <div className="group/share flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 p-2">
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center flex-shrink-0">
                          {m.sharedPosterUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={m.sharedPosterUrl} alt="" className="w-full h-full object-cover" />
                            : <div className="text-xl">📌</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{m.sharedTitle ?? "Элемент"}</p>
                          <p className="text-xs text-muted-foreground">
                            {(m.sharedType ?? "").toString()} {m.sharedYear ?? ""}
                          </p>
                        </div>
                        {(() => {
                          const alreadyOwned =
                            ownedShareKeys.has(`${m.sharedType}::${m.sharedTitle}::${m.sharedYear ?? ""}`) ||
                            ownedShareKeys.has(`${m.sharedType}::${m.sharedTitle}::`);
                          return alreadyOwned ? (
                            <span className="text-[10px] px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 whitespace-nowrap">
                              ✓ Уже в коллекции
                            </span>
                          ) : (
                            <button
                              onClick={() => addSharedToCollection(m)}
                              className="text-[11px] px-2 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary opacity-0 group-hover/share:opacity-100 transition-opacity whitespace-nowrap"
                            >
                              + В коллекцию
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">{m.text}</p>
                  )}

                  {!m.deleted && (
                    <div className={cn("mt-2 flex items-center gap-1.5 flex-wrap", mine ? "justify-end" : "justify-start")}>
                      {(m.reactions ?? []).map((r) => (
                        <button
                          key={`${m.id}-${r.emoji}`}
                          onClick={() => toggleReaction(m.id, r.emoji)}
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full border transition-all",
                            r.mine
                              ? "border-primary/40 bg-primary/20 text-primary"
                              : "border-border/70 bg-muted/30 text-foreground/80 hover:border-primary/30"
                          )}
                          title="Переключить реакцию"
                        >
                          {r.emoji} {r.count}
                        </button>
                      ))}
                      {["👍", "🔥", "❤️"].map((emoji) => (
                        <button
                          key={`${m.id}-add-${emoji}`}
                          onClick={() => toggleReaction(m.id, emoji)}
                          className="text-xs px-2 py-0.5 rounded-full border border-border/60 bg-card/30 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                          title={`Реакция ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {mine && !m.deleted && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => deleteMessage(m.id)}
                        className="text-xs px-2 py-1 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors focus-ring"
                        title="Удалить у всех"
                      >
                        🗑 Удалить
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-border/60">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Сообщение…"
              className="flex-1 min-h-[44px] max-h-32 resize-none bg-card/40 border border-border/70 rounded-xl px-3 py-2 text-sm text-foreground focus-ring"
            />
            <button
              onClick={send}
              className="btn-primary focus-ring interactive-soft"
            >
              Отправить
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Enter — отправить · Shift+Enter — новая строка</p>
        </div>
      </div>
    </div>
  );
}

// Основной экран "Друзья": список, входящие/исходящие заявки и запуск чата.
export default function FriendsClient({ currentUserId }: { currentUserId: string }) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"friends" | "search" | "requests">("friends");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatFriend, setChatFriend] = useState<FriendUser | null>(null);
  const searchParams = useSearchParams();

  // Загружает актуальное состояние дружбы (друзья, входящие и исходящие заявки).
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
    // Если чат открыт из профиля пользователя, не уводим интерфейс на вкладку "Друзья".
    if (searchParams.get("chat") && searchParams.get("source") === "profile") {
      setActiveTab("search");
    }
  }, [searchParams]);

  useEffect(() => {
    const chatId = searchParams.get("chat");
    if (!chatId || friends.length === 0) return;
    const target = friends.find((f) => f.other.id === chatId);
    if (!target) return;
    setChatFriend(target.other);
    setChatOpen(true);
  }, [friends, searchParams]);

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

  // Отправляет заявку в друзья выбранному пользователю.
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

  // Принимает или отклоняет входящую заявку.
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

  // Удаляет пользователя из друзей.
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
                <Link href={`/user/${f.other.id}`} className="flex-1 min-w-0 block rounded-lg px-1 py-0.5 hover:bg-muted/30 transition-colors">
                  <p className="font-semibold text-foreground hover:text-primary transition-colors">
                    {f.other.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{f.other.email}</p>
                  <p className="text-[11px] text-primary/70 mt-1">Открыть коллекцию →</p>
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setChatFriend(f.other); setChatOpen(true); }}
                    className="text-xs bg-card/30 hover:bg-muted/40 text-foreground border border-border/70 hover:border-primary/30 px-3 py-1.5 rounded-lg transition-all"
                    title="Сообщения"
                  >
                    💬
                  </button>
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

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        meId={currentUserId}
        friend={chatFriend}
      />
    </div>
  );
}