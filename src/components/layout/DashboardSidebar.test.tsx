import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardSidebar from "./DashboardSidebar";
import {
  routerPushMock,
  setMockPathname,
  signOutMock,
  toastSuccessMock,
} from "@/test/setup";

describe("DashboardSidebar", () => {
  it("highlights active link and signs user out", async () => {
    setMockPathname("/dashboard");

    render(
      <DashboardSidebar
        user={{ id: "u1", name: "Иван Петров", email: "ivan@example.com", image: null }}
      />
    );

    expect(screen.getAllByRole("link", { name: /Поиск/i })[0]).toHaveAttribute("href", "/dashboard");

    fireEvent.click(screen.getByRole("button", { name: "☰" }));
    signOutMock.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole("button", { name: /Выйти/i }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(toastSuccessMock).toHaveBeenCalledWith("Вы вышли из системы");
    expect(routerPushMock).toHaveBeenCalledWith("/");
  });

  it("reads pinned state and refreshes profile after custom event", async () => {
    localStorage.setItem("mediateka-sidebar-pinned", "1");
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ user: { name: "Обновлённый пользователь" } }),
    }) as typeof fetch;

    render(
      <DashboardSidebar
        user={{ id: "u1", name: "Иван Петров", email: "ivan@example.com", image: null }}
      />
    );

    window.dispatchEvent(new Event("profile-updated"));

    expect(await screen.findAllByText("Обновлённый пользователь")).not.toHaveLength(0);
  });
});
