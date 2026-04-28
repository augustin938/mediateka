import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MediaCardSkeleton from "./MediaCardSkeleton";

describe("MediaCardSkeleton", () => {
  it("renders skeleton placeholders", () => {
    const { container } = render(<MediaCardSkeleton />);

    expect(container.querySelectorAll(".skeleton")).toHaveLength(3);
  });
});
