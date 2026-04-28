import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MediaCard from "./MediaCard";

describe("MediaCard", () => {
  it("renders media details and calls click handler", () => {
    const onClick = vi.fn();

    render(
      <MediaCard
        item={{
          id: "movie-1",
          externalId: "ext-1",
          type: "movie",
          title: "Dune",
          originalTitle: null,
          description: null,
          posterUrl: "https://example.com/dune.jpg",
          year: 2024,
          genres: ["Sci-Fi"],
          externalRating: "8.5/10",
          externalUrl: null,
          director: null,
          author: null,
          developer: null,
          inCollection: true,
          collectionStatus: "COMPLETED",
        }}
        onClick={onClick}
      />
    );

    expect(screen.getByRole("img", { name: "Dune" })).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText(/★ 8.5/)).toBeInTheDocument();
    expect(screen.getByText("Завершено")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("falls back to media icon when poster is missing", () => {
    render(
      <MediaCard
        item={{
          id: "book-1",
          externalId: "ext-2",
          type: "book",
          title: "The Hobbit",
          originalTitle: null,
          description: null,
          posterUrl: null,
          year: null,
          genres: [],
          externalRating: null,
          externalUrl: null,
          director: null,
          author: "Tolkien",
          developer: null,
        }}
        onClick={() => {}}
      />
    );

    expect(screen.getAllByText("📚").length).toBeGreaterThan(0);
    expect(screen.getByText("The Hobbit")).toBeInTheDocument();
  });
});
