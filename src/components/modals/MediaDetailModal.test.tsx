import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MediaDetailModal from "./MediaDetailModal";
import { toastErrorMock, toastInfoMock, toastSuccessMock } from "@/test/setup";

const baseItem = {
  id: "movie-1",
  externalId: "ext-1",
  title: "Dune",
  originalTitle: null,
  type: "movie" as const,
  year: 2024,
  posterUrl: null,
  genres: ["Sci-Fi"],
  description: "Epic sci-fi",
  externalUrl: "https://example.com",
  externalRating: "8.5/10",
  director: "Denis Villeneuve",
  author: null,
  developer: null,
};

describe("MediaDetailModal", () => {
  it("adds item to collection", async () => {
    const onAddToCollection = vi.fn();
    const onClose = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ item: { id: "collection-1" } }),
    }) as typeof fetch;

    render(
      <MediaDetailModal
        item={baseItem}
        onClose={onClose}
        onAddToCollection={onAddToCollection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Завершено" }));
    fireEvent.click(screen.getByRole("button", { name: /Добавить в коллекцию/i }));

    await waitFor(() => expect(onAddToCollection).toHaveBeenCalled());
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("handles already existing collection item", async () => {
    const onAddToCollection = vi.fn();
    const onClose = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({}),
    }) as typeof fetch;

    render(
      <MediaDetailModal
        item={baseItem}
        onClose={onClose}
        onAddToCollection={onAddToCollection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Добавить в коллекцию/i }));

    await waitFor(() => expect(toastInfoMock).toHaveBeenCalledWith("Уже в коллекции"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows collection tags for existing item", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ tags: [{ id: "t1", name: "Любимое", color: "#111" }] }) })
      .mockResolvedValueOnce({ json: async () => ({ tags: [] }) }) as typeof fetch;

    render(
      <MediaDetailModal
        item={{ ...baseItem, inCollection: true, collectionStatus: "WANT", collectionItemId: "c1" }}
        onClose={() => {}}
        onAddToCollection={() => {}}
      />
    );

    expect(await screen.findByText("Любимое")).toBeInTheDocument();
  });
});
