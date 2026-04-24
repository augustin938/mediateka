import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import SiteFooter from "@/components/layout/SiteFooter";
import "./globals.css";

const themeInitScript = `
(() => {
  try {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem("mediateka-theme");
    const legacyTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = savedTheme ?? legacyTheme ?? (prefersDark ? "dark" : "light");

    root.classList.remove("theme-dark", "theme-light", "theme-midnight", "theme-forest", "theme-sunset", "theme-rose");
    root.classList.add("theme-" + resolved);

    if (resolved === "light") root.classList.remove("dark");
    else root.classList.add("dark");

    localStorage.setItem("mediateka-theme", resolved);
    localStorage.setItem("theme", resolved === "light" ? "light" : "dark");
  } catch {}
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Медиатека",
    template: "%s · Медиатека",
  },
  description: "Личная коллекция фильмов, книг и игр. Отслеживай просмотренное, читаемое и пройденное.",
  keywords: ["коллекция", "фильмы", "книги", "игры", "медиатека", "трекер"],
  manifest: "/manifest.json",
  icons: {
  icon: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Медиатека",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Медиатека",
    title: "Медиатека — личная коллекция",
    description: "Отслеживай фильмы, книги и игры в одном месте",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060914" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
          <Toaster
            position="bottom-right"
            theme="system"
            toastOptions={{ style: { border: "1px solid rgba(255,255,255,0.1)" } }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
