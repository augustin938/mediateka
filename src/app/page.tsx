import Link from "next/link";

const DEMO_ITEMS = [
  {
    title: "Dune: Part Two",
    type: "🎬",
    year: 2024,
    status: "COMPLETED",
    rating: 9,
    poster: "https://image.tmdb.org/t/p/w300/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  },
  {
    title: "The Name of the Wind",
    type: "📚",
    year: 2007,
    status: "IN_PROGRESS",
    rating: null,
    poster: null,
  },
  {
    title: "Elden Ring",
    type: "🎮",
    year: 2022,
    status: "COMPLETED",
    rating: 10,
    poster:
      "https://media.rawg.io/media/games/b54/b54598d1d5cc31899f4f0a7e3122a7b0.jpg",
  },
  {
    title: "Severance",
    type: "🎬",
    year: 2022,
    status: "WANT",
    rating: null,
    poster: "https://image.tmdb.org/t/p/w300/lh0aOvL93JgmUHVqhKEtYMPjhBM.jpg",
  },
];

const STATUS_STYLES: Record<string, string> = {
  COMPLETED:
    "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2 py-0.5 rounded-full",
  IN_PROGRESS:
    "bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2 py-0.5 rounded-full",
  WANT: "bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2 py-0.5 rounded-full",
  DROPPED:
    "bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2 py-0.5 rounded-full",
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Завершено",
  IN_PROGRESS: "В процессе",
  WANT: "Хочу",
  DROPPED: "Брошено",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-background/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display text-xl font-bold text-gradient">
            Медиатека
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="text-sm bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Фильмы · Книги · Игры — в одном месте
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-tight mb-6">
          Твоя личная{" "}
          <span className="text-gradient">медиатека</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
          Каталогизируй свои фильмы, книги и игры. Ищи по миллионам произведений,
          добавляй в коллекцию, оставляй оценки и отслеживай прогресс.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
          >
            Создать коллекцию →
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto glass text-foreground font-medium px-8 py-3.5 rounded-xl transition-all duration-200 hover:bg-white/8"
          >
            Войти в аккаунт
          </Link>
        </div>
      </section>

      {/* Demo Cards */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-widest">
            Пример коллекции
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DEMO_ITEMS.map((item, i) => (
              <div
                key={i}
                className="glass rounded-xl overflow-hidden group hover:-translate-y-1 transition-all duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="aspect-[2/3] bg-muted/50 relative overflow-hidden">
                  {item.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {item.type}
                    </div>
                  )}
                  <div className="absolute top-2 left-2 text-lg">{item.type}</div>
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-sm font-semibold font-display leading-tight line-clamp-2">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.year}</p>
                  <div className="flex items-center justify-between">
                    <span className={STATUS_STYLES[item.status]}>
                      {STATUS_LABEL[item.status]}
                    </span>
                    {item.rating && (
                      <span className="text-xs text-amber-400">
                        ★ {item.rating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-16">
            Всё что нужно для твоего досуга
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "🔍",
                title: "Умный поиск",
                desc: "Ищи сразу по всем источникам — TMDB, OpenLibrary, RAWG. Находи нужное мгновенно.",
              },
              {
                icon: "📊",
                title: "Статусы и оценки",
                desc: 'Отслеживай что хочешь, смотришь, прочитал или забросил. Оценки от 1 до 10.',
              },
              {
                icon: "📱",
                title: "Везде и всегда",
                desc: "Адаптивный дизайн работает на любом устройстве — телефоне, планшете, компьютере.",
              },
            ].map((f, i) => (
              <div key={i} className="glass rounded-2xl p-6 space-y-3">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="font-display font-semibold text-lg">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-sm text-muted-foreground">
        <span className="font-display font-bold text-gradient">Медиатека</span>
        {" "}— каталогизируй своё время.
      </footer>
    </div>
  );
}
