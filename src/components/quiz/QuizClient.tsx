"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

type QType = "description" | "year" | "genre" | "rating" | "poster" | "poster_reveal" | "creator";
type Mode  = "classic" | "endless";
type Cat   = "all" | "movie" | "book" | "game";

interface Question {
  id: number;
  type: QType;
  mediaType: string;
  question: string;
  hint: string;
  options: string[];
  answer: string;
  title: string;
  year: number | null;
  genres: string[];
  posterUrl: string | null;
  creator: string | null;
  review: string | null;
  rating: number | null;
}

const TIMER_SECS  = 15;
const TYPE_EMOJI: Record<QType, string> = {
  description:  "📖",
  year:         "📅",
  genre:        "🎭",
  rating:       "⭐",
  poster:       "🖼",
  poster_reveal:"🔍",
  creator:      "👤",
};
const TYPE_LABEL: Record<QType, string> = {
  description:  "Описание",
  year:         "Год",
  genre:        "Жанр",
  rating:       "Оценка",
  poster:       "Постер",
  poster_reveal:"Угадай постер",
  creator:      "Создатель",
};
const CAT_LABELS: Record<Cat, string>  = { all: "🌐 Всё", movie: "🎬 Фильмы", book: "📚 Книги", game: "🎮 Игры" };
const TIER_THRESHOLDS = [
  { min: 90, label: "🏆 Легенда",  color: "text-amber-400" },
  { min: 70, label: "🥇 Эксперт",  color: "text-yellow-400" },
  { min: 50, label: "🎓 Знаток",   color: "text-green-400" },
  { min: 30, label: "📚 Любитель", color: "text-blue-400" },
  { min: 0,  label: "🌱 Новичок",  color: "text-muted-foreground" },
];

// Важный внутренний helper getTier для локальной логики.
function getTier(score: number, total: number) {
  const pct = total > 0 ? (score / total) * 100 : 0;
  return TIER_THRESHOLDS.find((t) => pct >= t.min) ?? TIER_THRESHOLDS.at(-1)!;
}

function PosterReveal({ src, revealed }: { src: string; revealed: number }) {
  // Постер делится на 16 плиток, открываем их постепенно.
  const COLS = 4, ROWS = 4, TOTAL = COLS * ROWS;
  const order = useRef<number[]>([]);
  if (order.current.length === 0) {
    order.current = Array.from({ length: TOTAL }, (_, i) => i).sort(() => Math.random() - 0.5);
  }
  const uncoveredSet = new Set(order.current.slice(0, revealed));

  return (
    <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-muted/20 max-w-[180px] mx-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="poster" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <div
            key={i}
            className="transition-opacity duration-500"
            style={{
              backgroundColor: "hsl(var(--card))",
              opacity: uncoveredSet.has(i) ? 0 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SetupScreen({ onStart }: { onStart: (mode: Mode, cat: Cat) => void }) {
  const [mode, setMode] = useState<Mode>("classic");
  const [cat,  setCat]  = useState<Cat>("all");

  return (
    <div className="max-w-md mx-auto space-y-8 py-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="text-6xl">🎮</div>
        <h1 className="text-2xl font-display font-bold text-foreground">Квиз по коллекции</h1>
        <p className="text-sm text-muted-foreground">Проверь, как хорошо ты помнишь свою коллекцию</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Режим</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: "classic", icon: "🎯", title: "Классик", desc: "10 вопросов, финальный счёт" },
            { id: "endless", icon: "♾️", title: "Бесконечный", desc: "Пока не ошибёшься" },
          ] as const).map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={cn("p-4 rounded-2xl border text-left transition-all",
                mode === m.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/30")}>
              <div className="text-2xl mb-1">{m.icon}</div>
              <div className="font-semibold text-sm text-foreground">{m.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Категория</p>
        <div className="grid grid-cols-2 gap-2">
          {(["all", "movie", "book", "game"] as Cat[]).map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={cn("py-2.5 px-4 rounded-xl border text-sm font-medium transition-all",
                cat === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
              {CAT_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => onStart(mode, cat)}
        className="w-full bg-primary hover:bg-primary/90 text-white py-3.5 rounded-2xl font-semibold text-base transition-colors">
        Начать квиз →
      </button>
    </div>
  );
}

interface QuestionCardProps {
  q: Question;
  qIndex: number;
  total: number | null;
  score: number;
  streak: number;
  onAnswer: (ans: string, timeLeft: number) => void;
  answered: string | null;
  isCorrect: boolean | null;
  onNext: () => void;
  onExit: () => void;
  mode: Mode;
  lives: number;
}

// Важный внутренний helper QuestionCard для локальной логики.
function QuestionCard({ q, qIndex, total, score, streak, onAnswer, answered, isCorrect, onNext, onExit, mode, lives }: QuestionCardProps) {
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
  const [revealed, setRevealed] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // На каждый новый вопрос перезапускаем таймер и состояние открытия постера.
  useEffect(() => {
    setTimeLeft(TIMER_SECS);
    setRevealed(0);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // В режиме открытия постера показываем по одной плитке каждые 700 мс.
    if (q.type === "poster_reveal") {
      revealRef.current = setInterval(() => {
        setRevealed((r) => {
          if (r >= 16) { clearInterval(revealRef.current!); return 16; }
          return r + 1;
        });
      }, 700);
    }

    return () => {
      clearInterval(timerRef.current!);
      clearInterval(revealRef.current!);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);

  useEffect(() => {
    if (timeLeft === 0 && answered === null) {
      onAnswer("__timeout__", 0);
    }
  }, [timeLeft, answered, onAnswer]);

  useEffect(() => {
    if (answered !== null) {
      clearInterval(timerRef.current!);
      clearInterval(revealRef.current!);
      if (q.type === "poster_reveal") setRevealed(16);
    }
  }, [answered, q.type]);

  // Быстрые клавиши: 1-4 для ответа, Enter/Space для перехода дальше.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (answered !== null) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNext(); } return; }
      const n = parseInt(e.key);
      if (n >= 1 && n <= 4 && q.options[n - 1]) onAnswer(q.options[n - 1], timeLeft);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answered, q.options, timeLeft, onAnswer, onNext]);

  const timerPct = (timeLeft / TIMER_SECS) * 100;
  const timerColor = timerPct > 60 ? "bg-emerald-500" : timerPct > 30 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={onExit}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-xs border border-border/50 rounded-lg px-2 py-1 hover:bg-muted"
            title="Выйти в меню"
          >
            ← Меню
          </button>
          {total ? (
            <span className="text-muted-foreground font-medium">{qIndex + 1} / {total}</span>
          ) : (
            <span className="text-muted-foreground font-medium">#{qIndex + 1}</span>
          )}
          <span className="text-amber-400 font-bold">⭐ {score}</span>
          {streak >= 3 && <span className="text-orange-400 font-bold animate-pulse">🔥 ×{streak}</span>}
        </div>
        <div className="flex items-center gap-2">
          {mode === "endless" && Array.from({ length: 3 }, (_, i) => (
            <span key={i} className={i < lives ? "text-red-400" : "text-muted-foreground/30"}>❤️</span>
          ))}
          <div className="text-sm font-mono font-bold w-6 text-right"
            style={{ color: timerPct > 60 ? "#34d399" : timerPct > 30 ? "#fbbf24" : "#f87171" }}>
            {timeLeft}
          </div>
        </div>
      </div>

      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-1000", timerColor)} style={{ width: `${timerPct}%` }} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
          {TYPE_EMOJI[q.type]} {TYPE_LABEL[q.type]}
        </span>
        <span className="text-xs text-muted-foreground">{q.hint}</span>
      </div>

      <div className="glass rounded-2xl p-5 min-h-[140px] flex items-center justify-center">
        {(q.type === "poster" || q.type === "poster_reveal") && q.posterUrl ? (
          <div className="w-full flex flex-col items-center gap-2">
            {q.type === "poster_reveal" && answered === null ? (
              <PosterReveal src={q.posterUrl} revealed={revealed} />
            ) : q.type === "poster_reveal" && answered !== null ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.posterUrl} alt="poster" className="max-h-52 mx-auto rounded-xl object-cover" />
            ) : (
              <div className="relative max-w-[180px] mx-auto rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={q.posterUrl}
                  alt="poster"
                  className="w-full rounded-xl object-cover"
                  style={{
                    filter: answered === null ? "blur(20px)" : "none",
                    transform: answered === null ? "scale(1.1)" : "scale(1)",
                    transition: "filter 0.6s ease, transform 0.6s ease",
                  }}
                />
                {answered === null && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm font-medium select-none">
                    🖼 Угадай!
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-base text-foreground leading-relaxed text-center">{q.question}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          const isSelected  = answered === opt;
          const isRight     = opt === q.answer;
          let style = "border-border text-foreground hover:border-primary/40 hover:bg-primary/5";
          if (answered !== null) {
            if (isRight)     style = "border-emerald-500 bg-emerald-500/15 text-emerald-400";
            else if (isSelected) style = "border-red-500 bg-red-500/15 text-red-400";
            else             style = "border-border/40 text-muted-foreground/50";
          }

          return (
            <button key={opt} disabled={answered !== null}
              onClick={() => onAnswer(opt, timeLeft)}
              className={cn("relative p-3.5 rounded-xl border text-sm font-medium text-left transition-all", style)}>
              <span className="absolute top-3 right-3 text-xs text-muted-foreground/40">{i + 1}</span>
              <span className="pr-5 leading-snug">{opt}</span>
              {answered !== null && isRight  && <span className="ml-1">✓</span>}
              {answered !== null && isSelected && !isRight && <span className="ml-1">✗</span>}
            </button>
          );
        })}
      </div>

      {answered !== null && (
        <div className={cn("rounded-2xl p-4 border animate-fade-in space-y-2",
          isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30")}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{isCorrect ? "✅" : "❌"}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{q.title}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                {q.year && <span>{q.year}</span>}
                {q.creator && <span>· {q.creator}</span>}
                {q.genres.length > 0 && <span>· {q.genres.slice(0, 2).join(", ")}</span>}
                {q.rating && <span>· ⭐ {q.rating}/10</span>}
              </div>
            </div>
          </div>
          {q.review && (
            <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">"{q.review}"</p>
          )}
        </div>
      )}

      {answered !== null && (
        <button onClick={onNext}
          className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-2xl font-semibold transition-colors">
          Следующий → <span className="text-xs opacity-60 ml-1">[Enter]</span>
        </button>
      )}
    </div>
  );
}

interface ResultsProps {
  points: number;
  correctAnswers: number;
  total: number;
  streak: number;
  mode: Mode;
  category: Cat;
  history: { q: Question; ans: string; correct: boolean }[];
  onRestart: () => void;
  onSetup: () => void;
}

// Важный внутренний helper ResultsScreen для локальной логики.
function ResultsScreen({ points, correctAnswers, total, streak, mode, category, history, onRestart, onSetup }: ResultsProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // После завершения автоматически сохраняем результат в профиль.
    fetch("/api/quiz/results", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, category, points, correctAnswers, total, streak }),
    }).then(() => setSaved(true)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tier = getTier(correctAnswers, total);
  const pct  = total > 0 ? Math.round((correctAnswers / total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto py-4">
      <div className="glass rounded-2xl p-6 text-center space-y-2">
        <div className="text-5xl font-display font-black text-foreground">{correctAnswers}<span className="text-2xl text-muted-foreground">/{total}</span></div>
        <div className={cn("text-xl font-bold", tier.color)}>{tier.label}</div>
        <div className="text-sm text-muted-foreground">{pct}% правильных ответов</div>
        <div className="text-sm text-amber-400 font-semibold">⭐ Очки: {points}</div>
        {streak >= 3 && <div className="text-sm text-orange-400">🔥 Лучшая серия: {streak}</div>}
        {mode === "endless" && <div className="text-xs text-muted-foreground">Бесконечный режим · {CAT_LABELS[category]}</div>}
        {saved && <div className="text-xs text-emerald-400 mt-1">✓ Результат сохранён</div>}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Разбор ответов</p>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {history.map((h, i) => (
            <div key={i} className={cn("flex items-start gap-3 p-3 rounded-xl border text-sm",
              h.correct ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5")}>
              <span className="mt-0.5 flex-shrink-0">{h.correct ? "✅" : "❌"}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{h.q.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {TYPE_EMOJI[h.q.type]} {TYPE_LABEL[h.q.type]}
                  {!h.correct && h.ans !== "__timeout__" && ` · ты: "${h.ans}"`}
                  {h.ans === "__timeout__" && " · 🕐 время вышло"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onRestart}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-2xl font-semibold transition-colors">
          🔄 Ещё раз
        </button>
        <button onClick={onSetup}
          className="flex-1 border border-border hover:bg-muted text-foreground py-3 rounded-2xl font-medium transition-colors">
          ⚙️ Настройки
        </button>
      </div>
    </div>
  );
}

// Основной экспортируемый компонент файла.
export default function QuizClient() {
  const [phase,    setPhase]    = useState<"setup" | "playing" | "results">("setup");
  const [mode,     setMode]     = useState<Mode>("classic");
  const [category, setCategory] = useState<Cat>("all");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex,    setQIndex]    = useState(0);
  const [score,     setScore]     = useState(0);
  const [streak,    setStreak]    = useState(0);
  const [bestStreak,setBestStreak]= useState(0);
  const [lives,     setLives]     = useState(3);
  const [history,   setHistory]   = useState<{ q: Question; ans: string; correct: boolean }[]>([]);
  const [answered,  setAnswered]  = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const correctAnswers = history.filter((item) => item.correct).length;

  const fetchQuestions = useCallback(async (m: Mode, cat: Cat, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const count = m === "endless" ? 5 : 10;
      const res   = await fetch(`/api/quiz?category=${cat}&count=${count}`);
      const data  = await res.json();
      if (data.error === "not_enough") {
        setError("Недостаточно завершённых элементов в коллекции. Добавь хотя бы 4!");
        setLoading(false);
        return;
      }
      if (append) {
        setQuestions((prev) => [...prev, ...data.questions.map((q: Question, i: number) => ({ ...q, id: prev.length + i }))]);
      } else {
        setQuestions(data.questions);
        setQIndex(0);
      }
    } catch {
      setError("Ошибка загрузки вопросов");
    }
    setLoading(false);
  }, []);

  const handleStart = useCallback(async (m: Mode, cat: Cat) => {
    setMode(m); setCategory(cat);
    setScore(0); setStreak(0); setBestStreak(0);
    setLives(3); setHistory([]); setAnswered(null); setIsCorrect(null);
    await fetchQuestions(m, cat, false);
    setPhase("playing");
  }, [fetchQuestions]);

  const handleAnswer = useCallback((ans: string, timeLeft: number) => {
    if (answered !== null || !questions[qIndex]) return;
    const q       = questions[qIndex];
    const correct = ans !== "__timeout__" && ans === q.answer;

    setAnswered(ans);
    setIsCorrect(correct);

    if (correct) {
      // Быстрый ответ дает дополнительное очко.
      const bonus = timeLeft > 10 ? 1 : 0;
      // За каждую серию из 3 правильных ответов добавляем еще 1 очко.
      const newStreak = streak + 1;
      const streakBonus = newStreak > 0 && newStreak % 3 === 0 ? 1 : 0;
      setScore((s) => s + 1 + bonus + streakBonus);
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
    } else {
      setStreak(0);
      if (mode === "endless") setLives((l) => l - 1);
    }

    setHistory((h) => [...h, { q, ans, correct }]);
  }, [answered, questions, qIndex, streak, mode]);

  const handleNext = useCallback(() => {
    const q   = questions[qIndex];
    const die = mode === "endless" && lives <= 0 && !isCorrect;
    const end = mode === "classic" && qIndex + 1 >= questions.length;

    if (die || end) {
      setPhase("results");
      return;
    }

    const next = qIndex + 1;
    setQIndex(next);
    setAnswered(null);
    setIsCorrect(null);

    // В бесконечном режиме заранее подгружаем следующий пакет вопросов.
    if (mode === "endless" && next >= questions.length - 2) {
      fetchQuestions("endless", category, true);
    }
  }, [qIndex, questions, mode, lives, isCorrect, category, fetchQuestions]);
  if (phase === "setup") {
    return (
      <div className="max-w-lg mx-auto">
        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
        <SetupScreen onStart={handleStart} />
      </div>
    );
  }

  if (loading && questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Готовим вопросы…</p>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <ResultsScreen
        points={score} correctAnswers={correctAnswers} total={history.length} streak={bestStreak}
        mode={mode} category={category} history={history}
        onRestart={() => handleStart(mode, category)}
        onSetup={() => { setPhase("setup"); setError(null); }}
      />
    );
  }

  const currentQ = questions[qIndex];
  if (!currentQ) return null;

  return (
    <div className="max-w-lg mx-auto">
      <QuestionCard
        q={currentQ} qIndex={qIndex}
        total={mode === "classic" ? questions.length : null}
        score={score} streak={streak}
        onAnswer={handleAnswer}
        answered={answered} isCorrect={isCorrect}
        onNext={handleNext}
        onExit={() => { setPhase("setup"); setError(null); }}
        mode={mode} lives={lives}
      />
    </div>
  );
}