import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/notifications/NotificationsBell", () => ({
  default: () => <div data-testid="notifications-bell" />,
}));

import DashboardTopbar from "./DashboardTopbar";
import {
  routerPushMock,
  setMockPathname,
} from "@/test/setup";

describe("DashboardTopbar", () => {
  it("renders page title and opens friend back navigation", () => {
    setMockPathname("/user/123");

    render(<DashboardTopbar />);

    fireEvent.click(screen.getByTitle("Назад к друзьям"));

    expect(routerPushMock).toHaveBeenCalledWith("/friends");
  });

  it("shows recent searches and quick links", async () => {
    setMockPathname("/dashboard");
    localStorage.setItem("mediateka-recent-searches", JSON.stringify(["Dune", "Metro 2033"]));

    render(<DashboardTopbar />);

    fireEvent.focus(screen.getByPlaceholderText(/Поиск.../i));

    expect(screen.getByText("Недавние запросы")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Коллекция/i }));
    expect(routerPushMock).toHaveBeenCalledWith("/collection");
  });

  it("searches and navigates by enter", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        results: [{ id: "1", type: "movie", title: "Dune", year: 2024, posterUrl: null }],
      }),
    }) as typeof fetch;

    render(<DashboardTopbar />);

    const input = screen.getByPlaceholderText(/Поиск.../i);
    fireEvent.change(input, { target: { value: "Du" } });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    fireEvent.keyDown(input, { key: "Enter" });

    expect(routerPushMock).toHaveBeenCalledWith("/dashboard?q=Du");
  });

  it("changes theme from theme picker", () => {
    render(<DashboardTopbar />);

    fireEvent.click(screen.getByTitle("Сменить тему"));
    fireEvent.click(screen.getByRole("button", { name: /Светлая/i }));

    expect(localStorage.getItem("mediateka-theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
