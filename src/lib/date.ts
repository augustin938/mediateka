// Публичная функция formatLocalDateKey для внешнего использования модуля.
export function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLocalMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Публичная функция formatRuShortDate для внешнего использования модуля.
export function formatRuShortDate(date: Date) {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// Публичная функция formatRuLongDate для внешнего использования модуля.
export function formatRuLongDate(date: Date) {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

// Публичная функция formatRuMonthLabel для внешнего использования модуля.
export function formatRuMonthLabel(date: Date) {
  return date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
}

// Публичная функция formatRelativeTime для внешнего использования модуля.
export function formatRelativeTime(dateInput: string | Date, now = new Date()) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} дн назад`;

  return formatRuLongDate(date);
}

// Публичная функция getRelativeDayLabel для внешнего использования модуля.
export function getRelativeDayLabel(dateInput: string | Date, now = new Date()) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";

  return formatRuLongDate(date);
}
