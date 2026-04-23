"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  friend_request: "👋",
  friend_accepted: "🤝",
  achievement: "🏆",
  message: "💬",
};

export default function NotificationsBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = () => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifs(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    let removedUnread = false;
    setNotifs((prev) => {
      const target = prev.find((n) => n.id === id);
      removedUnread = target?.read === false;
      return prev.filter((n) => n.id !== id);
    });
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (removedUnread) {
      setUnread((prev) => Math.max(0, prev - 1));
    }
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.read) await markRead(notif.id);
    setOpen(false);
    if (notif.link) router.push(notif.link);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative text-muted-foreground hover:text-foreground border border-border/70 hover:border-border px-3 py-1.5 rounded-lg transition-all duration-200 bg-card/30 backdrop-blur-md focus-ring",
          open && "border-primary/30 text-foreground shadow-glow-sm"
        )}
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border shadow-2xl z-50 overflow-hidden bg-card/90 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <h3 className="font-semibold text-foreground text-sm">Уведомления</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline focus-ring rounded-md px-1.5 py-1">
                Прочитать все
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto bg-card">
            {notifs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground space-y-2 bg-card">
                <div className="text-3xl">🔕</div>
                <p className="text-sm">Нет уведомлений</p>
              </div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group border-b border-border/50 last:border-0",
                    !n.read
                      ? "bg-primary/10 hover:bg-primary/15"
                      : "bg-card hover:bg-muted/40"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5",
                    !n.read ? "bg-primary/20" : "bg-muted/50"
                  )}>
                    {TYPE_ICONS[n.type] ?? "🔔"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm leading-snug",
                      !n.read ? "font-semibold text-foreground" : "text-foreground/80"
                    )}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => deleteNotif(e, n.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all text-xs flex-shrink-0 mt-1 focus-ring rounded-md px-1"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}