import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import LandingPage from "./page";

describe("LandingPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders main actions and demo content", () => {
    vi.useFakeTimers();

    render(<LandingPage />);
    vi.advanceTimersByTime(8000);

    expect(screen.getAllByRole("link", { name: /Войти/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Начать бесплатно/i })).toHaveAttribute("href", "/register");
    expect(screen.getByText("Пример коллекции")).toBeInTheDocument();
  });
});
