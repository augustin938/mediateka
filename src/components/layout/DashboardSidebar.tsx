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
  { href: "/dashboard", label: "Поиск", icon: "🔍" },
  { href: "/recommendations", label: "Для тебя", icon: "🎯" },
  { href: "/collection", label: "Коллекция", icon: "📚" },
  { href: "/activity", label: "История", icon: "📅" },
  { href: "/achievements", label: "Достижения", icon: "🏆" },
  { href: "/friends", label: "Друзья", icon: "👥" },
  { href: "/random", label: "Сегодня", icon: "🎲" },
  { href: "/stats", label: "Статистика", icon: "📊" },
  { href: "/tops", label: "Топы", icon: "🏆" },
];

export default function DashboardSidebar({ user: initialUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Вы вышли из системы");
    router.push("/");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + collapse */}
      <div className={cn("flex items-center h-16 px-4 border-b border-white/5 flex-shrink-0", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Link href="/dashboard" className="font-display text-lg font-bold text-gradient truncate">
            Медиатека
          </Link>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex w-7 h-7 rounded-lg border border-white/10 hover:border-primary/30 items-center justify-center text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                collapsed && "justify-center px-2"
              )}>
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user */}
      <div className="flex-shrink-0 p-3 border-t border-white/5 space-y-1">
        <Link href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5 group",
            collapsed && "justify-center px-2"
          )}>
          <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary/30 transition-all flex-shrink-0">
            <Avatar image={user.image} name={user.name} />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
        </Link>
        <button onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all",
            collapsed && "justify-center px-2"
          )}>
          <span className="text-base flex-shrink-0">🚪</span>
          {!collapsed && "Выйти"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col flex-shrink-0 border-r border-white/5 bg-background/60 backdrop-blur-xl sticky top-0 h-screen transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile: hamburger button (rendered in topbar via portal) */}
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
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-white/10 lg:hidden flex flex-col">
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
              <Link href="/dashboard" className="font-display text-lg font-bold text-gradient">
                Медиатека
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}>
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="p-3 border-t border-white/5">
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