import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AnimatedHeadline from "./AnimatedHeadline";

describe("AnimatedHeadline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows app title immediately", () => {
    render(<AnimatedHeadline name="Иван Петров" />);

    expect(screen.getByText("Медиатека")).toBeInTheDocument();
  });

  it("uses first name in animated subtitle", () => {
    vi.useFakeTimers();

    render(<AnimatedHeadline name="Иван Петров" />);

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText(/Иван/)).toBeInTheDocument();
  });
});
