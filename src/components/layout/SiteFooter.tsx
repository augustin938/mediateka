"use client";

import Link from "next/link";

const quickLinks = [
  { href: "/dashboard", label: "Поиск" },
  { href: "/collection", label: "Коллекция" },
  { href: "/stats", label: "Статистика" },
  { href: "/recommendations", label: "Рекомендации" },
];

const contacts = [
  {
    href: "https://t.me/boegolovka999",
    label: "Telegram",
    value: "@boegolovka999",
  },
  {
    href: "https://vk.com/yyyeeekto",
    label: "VK",
    value: "vk.com/yyyeeekto",
  },
  {
    href: "https://www.instagram.com/nikito4ka_k_v/",
    label: "Instagram",
    value: "@nikito4ka_k_v",
  },
  {
    href: "mailto:nikitak251105@gmail.com",
    label: "Email",
    value: "nikitak251105@gmail.com",
  },
  {
    href: "mailto:ez4gamer228@gmail.com",
    label: "Backup email",
    value: "ez4gamer228@gmail.com",
  },
];

const socialLinks = [
  {
    href: "https://t.me/boegolovka999",
    label: "Telegram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M21.5 3.5 2.8 10.8c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.8 5.7c.2.6.1.8.8.8.5 0 .7-.2 1-.5l2.3-2.2 4.9 3.6c.9.5 1.5.2 1.8-.8l3.2-15.2c.4-1.2-.4-1.8-1.7-1.3Zm-3.5 3.3-7.8 7.1-.3 3-1-3.2-3.3-1 12.4-5.9Z" />
      </svg>
    ),
  },
  {
    href: "https://vk.com/yyyeeekto",
    label: "VK",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M12.8 17h1.4s.4 0 .6-.2c.2-.2.2-.5.2-.5s0-1.5.7-1.7c.7-.2 1.5 1.4 2.4 2 .7.4 1.2.3 1.2.3l2.4-.1s1.2-.1.6-1c-.1-.1-.7-1.5-3.3-3.9-2.8-2.6 2.4-3.9 3.1-6.3.1-.4 0-.6-.6-.6h-2.7s-.4.1-.6.2c-.2.1-.2.3-.2.3s-.4 1-.8 1.9c-.9 1.9-1.2 2-1.4 1.9-.5-.3-.4-1.3-.4-2 0-2.2.3-3.1-.7-3.3-.3-.1-.5-.2-1.2-.2-1 0-1.8 0-2.3.2-.3.2-.6.5-.4.5.2 0 .6.1.8.4.3.4.3 1.2.3 1.2s.2 2.6-.5 2.9c-.5.2-1.2-1.8-2.1-3.8-.5-1.1-.9-1.6-.9-1.6s-.1-.2-.3-.3c-.2-.1-.4-.1-.4-.1H4.2s-.5 0-.7.2c-.2.2 0 .5 0 .5s2.6 6.1 5.5 9.2C11.7 17.2 12.8 17 12.8 17Z" />
      </svg>
    ),
  },
  {
    href: "https://www.instagram.com/nikito4ka_k_v/",
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM18.4 6.8a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z" />
        <path d="M12 2.7c3 0 3.3 0 4.5.1 1.1 0 1.7.2 2.1.4.6.2 1 .5 1.5 1 .4.4.8.9 1 1.5.2.4.4 1 .4 2.1.1 1.2.1 1.5.1 4.5 0 3 0 3.3-.1 4.5 0 1.1-.2 1.7-.4 2.1a4.4 4.4 0 0 1-1 1.5c-.4.4-.9.8-1.5 1-.4.2-1 .4-2.1.4-1.2.1-1.5.1-4.5.1-3 0-3.3 0-4.5-.1-1.1 0-1.7-.2-2.1-.4a4.4 4.4 0 0 1-1.5-1 4.4 4.4 0 0 1-1-1.5c-.2-.4-.4-1-.4-2.1C2.7 15.3 2.7 15 2.7 12c0-3 0-3.3.1-4.5 0-1.1.2-1.7.4-2.1.2-.6.5-1 1-1.5.4-.4.9-.8 1.5-1 .4-.2 1-.4 2.1-.4C8.7 2.7 9 2.7 12 2.7Zm0 1.8c-2.9 0-3.2 0-4.4.1-.9 0-1.4.2-1.8.3-.5.2-.8.3-1.1.7-.4.3-.5.6-.7 1.1-.1.4-.3.9-.3 1.8-.1 1.2-.1 1.5-.1 4.4s0 3.2.1 4.4c0 .9.2 1.4.3 1.8.2.5.3.8.7 1.1.3.4.6.5 1.1.7.4.1.9.3 1.8.3 1.2.1 1.5.1 4.4.1s3.2 0 4.4-.1c.9 0 1.4-.2 1.8-.3.5-.2.8-.3 1.1-.7.4-.3.5-.6.7-1.1.1-.4.3-.9.3-1.8.1-1.2.1-1.5.1-4.4s0-3.2-.1-4.4c0-.9-.2-1.4-.3-1.8a2.7 2.7 0 0 0-1.8-1.8c-.4-.1-.9-.3-1.8-.3-1.2-.1-1.5-.1-4.4-.1Z" />
      </svg>
    ),
  },
  {
    href: "mailto:nikitak251105@gmail.com",
    label: "Email",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Zm2.3-.7L12 10.7l6.7-4.9a.7.7 0 0 0-.2 0h-13a.7.7 0 0 0-.2 0Zm13.9 1.8-6.6 4.8a1 1 0 0 1-1.2 0L4.8 7.6V17.5c0 .4.3.7.7.7h13c.4 0 .7-.3.7-.7V7.6Z" />
      </svg>
    ),
  },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative mt-12 border-t border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-wide text-primary/90">Автор</p>
            <p className="text-lg font-semibold text-foreground">Никита Карпов</p>
            <p className="text-sm text-muted-foreground">Группа: 23м</p>
            <p className="text-sm text-muted-foreground">
              Персональный проект по ведению медиа-коллекции.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm uppercase tracking-wide text-primary/90">Контакты</p>
            <ul className="space-y-2">
              {contacts.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target={item.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={item.href.startsWith("mailto:") ? undefined : "noreferrer"}
                    className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    <span className="text-foreground/90">{item.label}:</span> {item.value}
                  </a>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <p className="mb-2 text-xs uppercase tracking-wide text-primary/80">Мы в сети</p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target={item.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={item.href.startsWith("mailto:") ? undefined : "noreferrer"}
                    aria-label={item.label}
                    className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/30 backdrop-blur-md px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-ring"
                  >
                    <span className="transition-transform duration-200 group-hover:scale-110">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm uppercase tracking-wide text-primary/90">Разделы</p>
            <ul className="space-y-2">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm uppercase tracking-wide text-primary/90">Дополнительно</p>
            <p className="text-sm text-muted-foreground">
              Данное веб-приложение является проектом для курсовой работы.
            </p>
            <p className="text-xs text-muted-foreground/80">
              Сделано с Next.js, Drizzle ORM.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <p>© {year} Mediateka by Augustin . All rights reserved.</p>
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/30 backdrop-blur-md px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-ring"
          >
            <span>Наверх</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
              <path d="M12 4.5c.2 0 .5.1.7.3l6 6a1 1 0 0 1-1.4 1.4L13 7.9V19a1 1 0 1 1-2 0V7.9l-4.3 4.3a1 1 0 0 1-1.4-1.4l6-6c.2-.2.4-.3.7-.3Z" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
