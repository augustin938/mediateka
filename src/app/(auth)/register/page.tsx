"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signUp, signIn } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: "Слабый", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Средний", color: "bg-amber-500" };
  if (score <= 3) return { score, label: "Хороший", color: "bg-blue-500" };
  return { score, label: "Надёжный", color: "bg-emerald-500" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [shake, setShake] = useState(false);

  const strength = getPasswordStrength(password);

  const validate = () => {
    const e: typeof errors = {};
    if (!name || name.trim().length < 2) e.name = "Имя должно быть не менее 2 символов";
    if (!email) e.email = "Введите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Некорректный email";
    if (!password) e.password = "Введите пароль";
    else if (password.length < 8) e.password = "Минимум 8 символов";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { setShake(true); setTimeout(() => setShake(false), 500); return; }
    setLoading(true);

    const { error } = await signUp.email({ name, email, password, callbackURL: "/dashboard" });

    if (error) {
      toast.error(error.message ?? "Ошибка регистрации");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      toast.success("Аккаунт создан!");
      router.push("/dashboard");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => await signIn.social({ provider: "google", callbackURL: "/dashboard" });
  const handleGithubLogin = async () => await signIn.social({ provider: "github", callbackURL: "/dashboard" });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className={cn("w-full max-w-md space-y-6 relative", shake && "animate-[shake_0.4s_ease-in-out]")}>
        <style>{`
          @keyframes shake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-5px)}
            80%{transform:translateX(5px)}
          }
        `}</style>

        <div className="text-center space-y-2">
          <Link href="/" className="inline-block font-display text-3xl font-bold text-gradient">
            Медиатека
          </Link>
          <p className="text-muted-foreground text-sm">Создайте аккаунт бесплатно</p>
        </div>

        <div className="glass rounded-2xl p-8 space-y-5">
          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-sm font-medium group">
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button onClick={handleGithubLogin}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-sm font-medium group">
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">или создайте аккаунт</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80">Имя</label>
              <input type="text" value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Ваше имя"
                className={cn(
                  "w-full bg-background/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground/50",
                  errors.name ? "border-red-500/50 focus:ring-red-500/20" : "border-white/10 focus:ring-primary/30 focus:border-primary/50"
                )} />
              {errors.name && <p className="text-xs text-red-400">⚠ {errors.name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80">Email</label>
              <input type="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                placeholder="you@example.com"
                className={cn(
                  "w-full bg-background/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground/50",
                  errors.email ? "border-red-500/50 focus:ring-red-500/20" : "border-white/10 focus:ring-primary/30 focus:border-primary/50"
                )} />
              {errors.email && <p className="text-xs text-red-400">⚠ {errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80">Пароль</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                  placeholder="Минимум 8 символов"
                  className={cn(
                    "w-full bg-background/50 border rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground/50",
                    errors.password ? "border-red-500/50 focus:ring-red-500/20" : "border-white/10 focus:ring-primary/30 focus:border-primary/50"
                  )} />
                <button type="button" onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm">
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">⚠ {errors.password}</p>}

              {/* Password strength */}
              {password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        strength.score >= i ? strength.color : "bg-muted/40"
                      )} />
                    ))}
                  </div>
                  <p className={cn("text-xs", strength.score <= 1 ? "text-red-400" : strength.score <= 2 ? "text-amber-400" : strength.score <= 3 ? "text-blue-400" : "text-emerald-400")}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Создание...</>
              ) : "Создать аккаунт →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">Войдите</Link>
        </p>
      </div>
    </div>
  );
}