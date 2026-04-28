import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RandomPicker from "./RandomPicker";
import { toastErrorMock } from "@/test/setup";

describe("RandomPicker", () => {
  it("renders picked item and stores history", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        item: {
          id: "c1",
          status: "WANT",
          mediaItem: {
            id: "m1",
            title: "Dune",
            type: "movie",
            year: 2024,
            posterUrl: null,
            genres: ["Sci-Fi"],
            description: "Epic",
            externalUrl: "https://example.com",
            externalRating: "8.5/10",
          },
        },
      }),
    }) as typeof fetch;

    render(<RandomPicker />);

    fireEvent.click(screen.getAllByRole("button", { name: /🎲/i })[1]);

    expect(await screen.findByText("Dune")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Смотреть/i })).toHaveAttribute("href", "https://example.com");
  }, 10000);

  it("shows empty message when collection has no matching items", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ item: null }),
    }) as typeof fetch;

    render(<RandomPicker />);

    fireEvent.click(screen.getAllByRole("button", { name: /🎲/i })[1]);

    expect(await screen.findByText("Список пуст 😅")).toBeInTheDocument();
  }, 10000);

  it("shows toast on request failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as typeof fetch;

    render(<RandomPicker />);

    fireEvent.click(screen.getAllByRole("button", { name: /🎲/i })[1]);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Ошибка загрузки"));
  }, 10000);
});
