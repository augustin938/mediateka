import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NotificationsBell from "./NotificationsBell";
import { routerPushMock } from "@/test/setup";

const notificationsPayload = {
  notifications: [
    {
      id: "n1",
      type: "message",
      title: "Новое сообщение",
      body: "Привет!",
      read: false,
      link: "/friends",
      createdAt: "2026-04-28T12:00:00.000Z",
    },
  ],
  unreadCount: 1,
};

describe("NotificationsBell", () => {
  it("loads notifications and marks all as read", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => notificationsPayload })
      .mockResolvedValueOnce({ json: async () => notificationsPayload })
      .mockResolvedValueOnce({ json: async () => ({}) }) as typeof fetch;

    render(<NotificationsBell />);

    await screen.findByText("1");
    fireEvent.click(screen.getByRole("button", { name: /🔔/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Прочитать все" }));

    expect(global.fetch).toHaveBeenCalledWith("/api/notifications", { method: "PATCH" });
  });

  it("opens notification link and marks one item as read", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => notificationsPayload })
      .mockResolvedValueOnce({ json: async () => notificationsPayload })
      .mockResolvedValueOnce({ json: async () => ({}) }) as typeof fetch;

    render(<NotificationsBell />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(await screen.findByText("Новое сообщение"));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/notifications/n1", { method: "PATCH" })
    );
    expect(routerPushMock).toHaveBeenCalledWith("/friends");
  });
});
