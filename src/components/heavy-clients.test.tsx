import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/modals/MediaDetailModal", () => ({
  default: ({ item }: { item: { title: string } }) => <div>top-modal:{item.title}</div>,
}));

import ActivityClient from "./activity/ActivityClient";
import AchievementsClient from "./achievements/AchievementsClient";
import CollectionClient from "./collection/CollectionClient";
import FriendsClient from "./friends/FriendsClient";
import UserProfileClient from "./friends/UserProfileClient";
import ProfileClient from "./profile/ProfileClient";
import QuizClient from "./quiz/QuizClient";
import RecommendationsClient from "./recommendations/RecommendationsClient";
import StatsClient from "./stats/StatsClient";
import TopsClient from "./tops/TopsClient";

describe("heavy client components", () => {
  it("renders empty states for activity and stats", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ logs: [] }) })
      .mockResolvedValueOnce({ json: async () => ({ total: 0 }) }) as typeof fetch;

    const { unmount } = render(<ActivityClient />);
    expect(await screen.findByText("История пуста")).toBeInTheDocument();
    unmount();

    render(<StatsClient />);
    expect(await screen.findByText("Статистика пуста")).toBeInTheDocument();
  });

  it("renders achievements summary from stats", () => {
    render(
      <AchievementsClient
        stats={{
          total: 12,
          movies: 5,
          books: 4,
          games: 3,
          completed: 2,
          dropped: 1,
          rated: 6,
          reviewed: 3,
          avgRating: 8.2,
          hasAllTypes: true,
          logCount: 10,
        }}
      />
    );

    expect(screen.getByText("Общий прогресс")).toBeInTheDocument();
    expect(screen.getByText(/% достижений получено/)).toBeInTheDocument();
  });

  it("renders collection empty state", () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ tags: [] }),
    }) as typeof fetch;

    render(<CollectionClient initialItems={[]} />);

    expect(screen.getByText("Коллекция пуста")).toBeInTheDocument();
  });

  it("renders empty friends state", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ friends: [], incoming: [], outgoing: [] }),
    }) as typeof fetch;

    render(<FriendsClient currentUserId="me" />);

    expect(await screen.findByText("Пока нет друзей")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Найти" }));
    expect(screen.getByPlaceholderText("Поиск по имени или email...")).toBeInTheDocument();
  });

  it("renders locked profile view for non-friend user", () => {
    render(
      <UserProfileClient
        profileUser={{ id: "u2", name: "Анна", email: "anna@example.com", image: null }}
        currentUserId="u1"
        friendship={null}
        collection={[]}
        isFriend={false}
      />
    );

    expect(screen.getByText(/Добавь Анна в друзья/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Добавить в друзья/i })).toBeInTheDocument();
  });

  it("renders profile widgets from props", () => {
    render(
      <ProfileClient
        user={{ id: "u1", name: "Иван Петров", email: "ivan@example.com", image: null }}
        stats={{
          total: 0,
          completed: 0,
          inProgress: 0,
          want: 0,
          movies: 0,
          books: 0,
          games: 0,
          avgRating: null,
        }}
        activityByDay={{}}
        collection={[]}
        initialPinnedIds={[]}
        quizHistory={[]}
      />
    );

    expect(screen.getByText("📌 Закреплённые")).toBeInTheDocument();
    expect(screen.getByText("Нет закреплённых")).toBeInTheDocument();
  });

  it("renders quiz setup screen", () => {
    render(<QuizClient />);

    expect(screen.getByText("Квиз по коллекции")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Начать квиз/i })).toBeInTheDocument();
  });

  it("renders recommendations empty state after loading", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        recommendations: [
          {
            title: "Dune",
            type: "movie",
            year: 2024,
            genres: ["Sci-Fi"],
            reason: "Похоже на любимые фильмы",
          },
        ],
        meta: { topGenres: ["Sci-Fi"], typeCounts: { movie: 1 }, total: 1 },
      }),
    }) as typeof fetch;

    render(<RecommendationsClient />);

    expect(await screen.findByText("Dune")).toBeInTheDocument();
  });

  it("renders tops list and opens details modal", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ items: [] }) })
      .mockResolvedValueOnce({
        json: async () => ({
          items: [
            {
              rank: 1,
              id: "top-1",
              externalId: "ext-1",
              title: "Dune",
              originalTitle: null,
              year: 2024,
              posterUrl: null,
              rating: "8.5/10",
              type: "movie",
              externalUrl: null,
              genres: ["Sci-Fi"],
            },
          ],
          totalPages: 1,
        }),
      }) as typeof fetch;

    render(<TopsClient />);

    expect(await screen.findByText("Dune")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Dune"));
    expect(screen.getByText("top-modal:Dune")).toBeInTheDocument();
  });
});
