import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { limits, rateLimit } from "./rate-limit";

function createRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/test", { headers });
}

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:00:00.000Z"));
    (globalThis as typeof globalThis & { __mediateka_rateLimitStore?: Map<string, unknown> })
      .__mediateka_rateLimitStore?.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as typeof globalThis & { __mediateka_rateLimitStore?: Map<string, unknown> })
      .__mediateka_rateLimitStore?.clear();
  });

  it("uses first forwarded IP and counts requests in the same window", () => {
    const req = createRequest({ "x-forwarded-for": "203.0.113.10, 198.51.100.1" });

    expect(rateLimit(req, "api", 2, 60)).toMatchObject({
      success: true,
      remaining: 1,
    });
    expect(rateLimit(req, "api", 2, 60)).toMatchObject({
      success: true,
      remaining: 0,
    });
    expect(rateLimit(req, "api", 2, 60)).toMatchObject({
      success: false,
      remaining: 0,
    });
  });

  it("resets the counter after the time window expires", () => {
    const req = createRequest({ "x-real-ip": "203.0.113.20" });

    expect(rateLimit(req, "quiz", 1, 10).success).toBe(true);
    expect(rateLimit(req, "quiz", 1, 10).success).toBe(false);

    vi.advanceTimersByTime(10_001);

    expect(rateLimit(req, "quiz", 1, 10)).toMatchObject({
      success: true,
      remaining: 0,
    });
  });

  it("keeps namespaces isolated", () => {
    const req = createRequest({ "x-real-ip": "203.0.113.30" });

    expect(rateLimit(req, "search", 1, 60).success).toBe(true);
    expect(rateLimit(req, "search", 1, 60).success).toBe(false);
    expect(rateLimit(req, "profile", 1, 60).success).toBe(true);
  });

  it("exposes preset limits with configured values", () => {
    const req = createRequest({ "x-real-ip": "203.0.113.40" });

    const result = limits.quiz(req);

    expect(result).toMatchObject({
      success: true,
      remaining: 19,
    });
  });
});
