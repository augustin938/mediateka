import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pushRecentSearch, readRecentSearches } from "./recent-searches";

class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("recent searches", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new LocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
  });

  it("reads only string values and applies the max limit", () => {
    localStorage.setItem(
      "mediateka-recent-searches",
      JSON.stringify(["film", 1, "book", null, "game", "anime", "manga", "show", "novel", "extra"])
    );

    expect(readRecentSearches()).toEqual([
      "film",
      "book",
      "game",
      "anime",
      "manga",
      "show",
      "novel",
      "extra",
    ]);
  });

  it("returns empty array for invalid JSON", () => {
    localStorage.setItem("mediateka-recent-searches", "{broken");

    expect(readRecentSearches()).toEqual([]);
  });

  it("adds trimmed queries to the front, removes duplicates and persists them", () => {
    const setItemSpy = vi.spyOn(localStorage, "setItem");

    const next = pushRecentSearch(["Dune", "Metro 2033", "Witcher"], "  Metro 2033  ");

    expect(next).toEqual(["Metro 2033", "Dune", "Witcher"]);
    expect(setItemSpy).toHaveBeenCalledWith(
      "mediateka-recent-searches",
      JSON.stringify(["Metro 2033", "Dune", "Witcher"])
    );
  });

  it("ignores too short queries", () => {
    const setItemSpy = vi.spyOn(localStorage, "setItem");
    const prev = ["Dune"];

    expect(pushRecentSearch(prev, " ")).toBe(prev);
    expect(pushRecentSearch(prev, "a")).toBe(prev);
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
