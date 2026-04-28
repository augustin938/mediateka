import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/modals/MediaDetailModal", () => ({
  default: ({
    item,
    onClose,
  }: {
    item: { title: string };
    onClose: () => void;
  }) => (
    <div>
      <span>modal:{item.title}</span>
      <button onClick={onClose}>close-modal</button>
    </div>
  ),
}));

import SearchSection from "./SearchSection";

describe("SearchSection", () => {
  it("renders example queries before search", () => {
    render(<SearchSection />);

    expect(screen.getByText("Начни с поиска")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Интерстеллар" })).toBeInTheDocument();
  });

  it("searches, renders results and opens modal", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        results: [
          {
            id: "movie-1",
            externalId: "ext-1",
            type: "movie",
            title: "Dune",
            originalTitle: null,
            description: null,
            posterUrl: null,
            year: 2024,
            genres: [],
            externalRating: "8.5/10",
            externalUrl: null,
            director: null,
            author: null,
            developer: null,
          },
        ],
        hasMore: false,
      }),
    }) as typeof fetch;

    render(<SearchSection initialQuery="Du" initialType="movie" />);

    expect(await screen.findByText("Фильмы и Сериалы 🎬")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Dune"));
    expect(screen.getByText("modal:Dune")).toBeInTheDocument();
  });

  it("shows empty state when nothing was found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ results: [], hasMore: false }),
    }) as typeof fetch;

    render(<SearchSection initialQuery="zz" initialType="movie" />);

    await waitFor(() => expect(screen.getByText("Ничего не найдено")).toBeInTheDocument());
  });
});
