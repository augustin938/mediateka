import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardError from "./dashboard/error";
import CollectionError from "./collection/error";
import StatsError from "./stats/error";
import QuizError from "./quiz/error";
import AchievementsError from "./achievements/error";
import RandomError from "./random/error";
import TopsError from "./tops/error";
import ProfileError from "./profile/error";
import ActivityError from "./activity/error";
import FriendsError from "./friends/error";

import DashboardLoading from "./dashboard/loading";
import CollectionLoading from "./collection/loading";
import StatsLoading from "./stats/loading";
import QuizLoading from "./quiz/loading";
import AchievementsLoading from "./achievements/loading";
import RandomLoading from "./random/loading";
import TopsLoading from "./tops/loading";
import ProfileLoading from "./profile/loading";
import ActivityLoading from "./activity/loading";
import FriendsLoading from "./friends/loading";

describe("dashboard error pages", () => {
  it("render page-specific copy and call reset", () => {
    const reset = vi.fn();
    const error = { name: "Error", message: "boom", digest: "digest-1" } as Error & { digest: string };
    const pages = [
      [DashboardError, "Поиск"],
      [CollectionError, "Коллекция"],
      [StatsError, "Статистика"],
      [QuizError, "Квиз"],
      [AchievementsError, "Достижения"],
      [RandomError, "Сегодня"],
      [TopsError, "Топы"],
      [ProfileError, "Профиль"],
      [ActivityError, "История"],
      [FriendsError, "Друзья"],
    ] as const;

    for (const [Component, label] of pages) {
      const { unmount } = render(<Component error={error} reset={reset} />);
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Попробовать снова" }));
      unmount();
    }

    expect(reset).toHaveBeenCalledTimes(10);
  });
});

describe("dashboard loading pages", () => {
  it("render skeleton state for all dashboard sections", () => {
    const pages = [
      DashboardLoading,
      CollectionLoading,
      StatsLoading,
      QuizLoading,
      AchievementsLoading,
      RandomLoading,
      TopsLoading,
      ProfileLoading,
      ActivityLoading,
      FriendsLoading,
    ];

    for (const Component of pages) {
      const { container, unmount } = render(<Component />);
      expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
      unmount();
    }
  });
});
