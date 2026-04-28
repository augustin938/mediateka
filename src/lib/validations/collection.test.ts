import { describe, expect, it } from "vitest";

import {
  addToCollectionSchema,
  collectionStatusSchema,
  searchQuerySchema,
  updateCollectionItemSchema,
} from "./collection";

describe("collection validation", () => {
  it("applies default collection status for new items", () => {
    const parsed = addToCollectionSchema.parse({
      mediaItemId: "media-1",
      externalId: "ext-1",
      type: "movie",
      title: "Dune",
    });

    expect(parsed.status).toBe("WANT");
  });

  it("rejects invalid media type and empty ids", () => {
    const result = addToCollectionSchema.safeParse({
      mediaItemId: "",
      externalId: "",
      type: "anime",
      title: "Title",
    });

    expect(result.success).toBe(false);
  });

  it("allows nullable optional update fields within allowed bounds", () => {
    const result = updateCollectionItemSchema.safeParse({
      status: "COMPLETED",
      rating: null,
      review: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects out of range ratings and oversized review", () => {
    const result = updateCollectionItemSchema.safeParse({
      rating: 11,
      review: "a".repeat(2001),
    });

    expect(result.success).toBe(false);
  });

  it("validates search query defaults and allowed statuses", () => {
    const search = searchQuerySchema.parse({ q: "dune" });

    expect(search.type).toBe("all");
    expect(collectionStatusSchema.options).toEqual([
      "WANT",
      "IN_PROGRESS",
      "COMPLETED",
      "DROPPED",
    ]);
  });
});
