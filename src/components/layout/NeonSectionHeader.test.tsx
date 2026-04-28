import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import NeonSectionHeader from "./NeonSectionHeader";

describe("NeonSectionHeader", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders title and optional badge", () => {
    render(<NeonSectionHeader title="Коллекция" subtitle="Мой каталог" badge="NEW" />);

    expect(screen.getByText("Коллекция")).toBeInTheDocument();
    expect(screen.getByText("NEW")).toBeInTheDocument();
  });

  it("prints subtitle gradually", () => {
    vi.useFakeTimers();

    render(<NeonSectionHeader title="Поиск" subtitle="Подсказка" />);

    expect(screen.queryByText("Подсказка")).not.toBeInTheDocument();

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText("Подсказка")).toBeInTheDocument();
  });
});
