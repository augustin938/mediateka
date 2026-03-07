"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  user: { id: string; name: string; email: string; image: string | null };
  stats: {
    total: number; completed: number; inProgress: number; want: number;
    movies: number; books: number; games: number; avgRating: string | null;
  };
}

function Avatar({ image, name, size = 96 }: { image: string | null; name: string; size?: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} className="w-full h-full object-cover" />;
  }
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/40 to-violet-600/40 text-white font-display font-bold"
      style={{ fontSize: size / 3 }}>
      {initials}
    </div>
  );
}

export default function ProfileClient({ user, stats }: Props) {
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState<string | null>(user.image);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимум 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!name.trim()) { toast.error("Имя не может быть пустым"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Ошибка сохранения"); return; }
      toast.success("Профиль обновлён");
      window.dispatchEvent(new Event("profile-updated"));
    } catch { toast.error("Ошибка сохранения"); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Пароли не совпадают"); return; }
    if (newPassword.length < 8) { toast.error("Пароль должен быть не менее 8 символов"); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Ошибка"); return; }
      toast.success("Пароль изменён");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch { toast.error("Ошибка"); }
    finally { setSavingPassword(false); }
  };

  const exportCSV = () => {
    window.open("/api/profile/export", "_blank");
    toast.success("Экспорт начат");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left — avatar + stats */}
      <div className="space-y-4">
        {/* Avatar card */}
        <div className="glass rounded-2xl p-6 flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-primary/30">
              <Avatar image={image} name={name} size={96} />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
            >
              📷 Сменить
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-lg text-foreground">{name || "—"}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Stats card */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="font-display font-semibold text-foreground">Статистика</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Всего", value: stats.total, icon: "📦" },
              { label: "Завершено", value: stats.completed, icon: "✅" },
              { label: "В процессе", value: stats.inProgress, icon: "▶️" },
              { label: "Хочу", value: stats.want, icon: "🔖" },
              { label: "Фильмы", value: stats.movies, icon: "🎬" },
              { label: "Книги", value: stats.books, icon: "📚" },
              { label: "Игры", value: stats.games, icon: "🎮" },
              { label: "Ср. оценка", value: stats.avgRating ? `${stats.avgRating}/10` : "—", icon: "⭐" },
            ].map((s) => (
              <div key={s.label} className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-lg">{s.icon}</p>
                <p className="font-bold text-foreground text-sm">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-display font-semibold text-foreground">Данные</h3>
          <p className="text-sm text-muted-foreground">Экспортируй всю коллекцию в CSV для Excel или Google Sheets</p>
          <button onClick={exportCSV}
            className="w-full flex items-center justify-center gap-2 text-sm border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-xl transition-all">
            📥 Скачать CSV
          </button>
        </div>
      </div>

      {/* Right — edit forms */}
      <div className="lg:col-span-2 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: "info", label: "👤 Основное" },
            { id: "password", label: "🔒 Пароль" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={cn("text-sm px-4 py-2 rounded-xl border transition-all font-medium",
                activeTab === tab.id
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "border-border text-muted-foreground hover:border-primary/30")}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Info tab */}
        {activeTab === "info" && (
          <div className="glass rounded-2xl p-6 space-y-5 animate-fade-in">
            <h3 className="font-display font-semibold text-foreground">Основная информация</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Имя</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Твоё имя"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Email</label>
              <input
                value={user.email}
                disabled
                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground/60">Email изменить нельзя</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Аватар</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden ring-1 ring-border flex-shrink-0">
                  <Avatar image={image} name={name} size={64} />
                </div>
                <div className="space-y-2 flex-1">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full text-sm border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl transition-all">
                    📷 Загрузить фото
                  </button>
                  {image && (
                    <button onClick={() => setImage(null)}
                      className="w-full text-sm border border-red-500/20 hover:border-red-500/40 text-red-400 px-4 py-2 rounded-xl transition-all">
                      🗑 Удалить аватар
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground/60">JPG, PNG до 2MB</p>
                </div>
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              {saving ? "Сохраняем..." : "Сохранить изменения"}
            </button>
          </div>
        )}

        {/* Password tab */}
        {activeTab === "password" && (
          <div className="glass rounded-2xl p-6 space-y-5 animate-fade-in">
            <h3 className="font-display font-semibold text-foreground">Смена пароля</h3>

            {[
              { label: "Текущий пароль", value: currentPassword, onChange: setCurrentPassword, placeholder: "••••••••" },
              { label: "Новый пароль", value: newPassword, onChange: setNewPassword, placeholder: "Минимум 8 символов" },
              { label: "Подтвердить пароль", value: confirmPassword, onChange: setConfirmPassword, placeholder: "Повтори новый пароль" },
            ].map((field) => (
              <div key={field.label} className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">{field.label}</label>
                <input
                  type="password"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            ))}

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400">Пароли не совпадают</p>
            )}

            <button
              onClick={savePassword}
              disabled={savingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              {savingPassword ? "Меняем..." : "Изменить пароль"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}