"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface SidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

function Avatar({ image, name }: { image?: string | null; name: string }) {
  const initials = name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "U";
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} className="w-full h-full object-cover rounded-full" />;
  }
  return (
    <div className="w-full h-full rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
      {initials}
    </div>
  );
}

const navItems = [
  { href: "/dashboard",       label: "Поиск",        icon: "🔍" },
  { href: "/recommendations", label: "Для тебя",     icon: "🎯" },
  { href: "/collection",      label: "Коллекция",    icon: "📚" },
  { href: "/quiz",            label: "Квиз",         icon: "🎮" },
  { href: "/activity",        label: "История",      icon: "📅" },
  { href: "/achievements",    label: "Достижения",   icon: "🏆" },
  { href: "/friends",         label: "Друзья",       icon: "👥" },
  { href: "/random",          label: "Сегодня",      icon: "🎲" },
  { href: "/stats",           label: "Статистика",   icon: "📊" },
  { href: "/tops",            label: "Топы",         icon: "🥇" },
];

export default function DashboardSidebar({ user: initialUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // expanded = hovered over the sidebar
  const expanded = hovered;

  useEffect(() => { setUser(initialUser); }, [initialUser]);

  useEffect(() => {
    const handler = () => {
      fetch("/api/profile/me")
        .then((r) => r.json())
        .then((data) => { if (data.user) setUser((prev) => ({ ...prev, ...data.user })); })
        .catch(() => {});
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Вы вышли из системы");
    router.push("/");
  };

  const NavLink = ({ item, compact }: { item: typeof navItems[0]; compact?: boolean }) => {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        title={compact ? item.label : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
          active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          compact && "justify-center px-2"
        )}
      >
        <span className="text-base flex-shrink-0">{item.icon}</span>
        {!compact && <span className="truncate">{item.label}</span>}
        {active && !compact && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
        )}
        {compact && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border rounded-lg text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  const sidebarContent = (compact = false) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/5 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.ico" alt="logo" className="w-6 h-6 flex-shrink-0" />
          <span className={cn(
            "font-display text-lg font-bold text-gradient whitespace-nowrap transition-all duration-300 overflow-hidden",
            compact ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>
            Медиатека
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => <NavLink key={item.href} item={item} compact={compact} />)}
      </nav>

      {/* User */}
      <div className="flex-shrink-0 p-3 border-t border-white/5 space-y-1">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5 group",
            compact && "justify-center px-2"
          )}
        >
          <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary/30 transition-all flex-shrink-0">
            <Avatar image={user.image} name={user.name} />
          </div>
          {!compact && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
        </Link>
        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all",
            compact && "justify-center px-2"
          )}
        >
          <span className="text-base flex-shrink-0">🚪</span>
          {!compact && "Выйти"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop — hover to expand */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "hidden lg:flex flex-col flex-shrink-0 border-r border-white/5 bg-background/60 backdrop-blur-xl sticky top-0 h-screen transition-all duration-300 ease-in-out overflow-hidden",
          expanded ? "w-56" : "w-16"
        )}
      >
        {sidebarContent(!expanded)}
      </aside>

      {/* Mobile FAB */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center text-xl"
      >
        ☰
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-white/10 lg:hidden flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
              <Link href="/dashboard" className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/favicon.ico" alt="logo" className="w-6 h-6" />
                <span className="font-display text-lg font-bold text-gradient">Медиатека</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
              {navItems.map((item) => <NavLink key={item.href} item={item} />)}
            </div>
            <div className="p-3 border-t border-white/5 space-y-1">
              <Link
                href="/profile"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5 group"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary/30 transition-all flex-shrink-0">
                  <Avatar image={user.image} name={user.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </Link>
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all">
                <span>🚪</span> Выйти
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}