import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SiteFooter from "./SiteFooter";

describe("SiteFooter", () => {
  it("renders links and scrolls to top", () => {
    render(<SiteFooter />);

    expect(screen.getByText("Никита Карпов")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Поиск" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute("href", "https://t.me/boegolovka999");

    fireEvent.click(screen.getByRole("button", { name: /Наверх/i }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
