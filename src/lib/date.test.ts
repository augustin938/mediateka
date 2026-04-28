import { describe, expect, it } from "vitest";

import {
  formatLocalDateKey,
  formatLocalMonthKey,
  formatRelativeTime,
  formatRuLongDate,
  getRelativeDayLabel,
} from "./date";

describe("date helpers", () => {
  it("formats local date and month keys with leading zeroes", () => {
    const date = new Date(2026, 3, 5, 12, 30);

    expect(formatLocalDateKey(date)).toBe("2026-04-05");
    expect(formatLocalMonthKey(date)).toBe("2026-04");
  });

  it("returns relative labels for minutes, hours and days", () => {
    const now = new Date("2026-04-28T12:00:00.000Z");

    expect(formatRelativeTime(new Date("2026-04-28T11:59:40.000Z"), now)).toBe("только что");
    expect(formatRelativeTime(new Date("2026-04-28T11:15:00.000Z"), now)).toBe("45 мин назад");
    expect(formatRelativeTime(new Date("2026-04-28T09:00:00.000Z"), now)).toBe("3 ч назад");
    expect(formatRelativeTime(new Date("2026-04-25T12:00:00.000Z"), now)).toBe("3 дн назад");
  });

  it("falls back to long date for older entries", () => {
    const now = new Date("2026-04-28T12:00:00.000Z");
    const oldDate = new Date("2026-04-10T12:00:00.000Z");

    expect(formatRelativeTime(oldDate, now)).toBe(formatRuLongDate(oldDate));
  });

  it("returns today and yesterday labels before long date fallback", () => {
    const now = new Date("2026-04-28T12:00:00.000Z");

    expect(getRelativeDayLabel(new Date("2026-04-28T08:00:00.000Z"), now)).toBe("Сегодня");
    expect(getRelativeDayLabel(new Date("2026-04-27T08:00:00.000Z"), now)).toBe("Вчера");

    const olderDate = new Date("2026-04-20T08:00:00.000Z");
    expect(getRelativeDayLabel(olderDate, now)).toBe(formatRuLongDate(olderDate));
  });
});
