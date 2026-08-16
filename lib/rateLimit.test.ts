import { describe, expect, it } from "vitest";
import { takeRateLimit } from "./rateLimit";

describe("takeRateLimit", () => {
  it("blokuje po wykorzystaniu limitu i otwiera nowe okno", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(takeRateLimit(key, 2, 1000, 1000).allowed).toBe(true);
    expect(takeRateLimit(key, 2, 1000, 1001).allowed).toBe(true);
    expect(takeRateLimit(key, 2, 1000, 1002)).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(takeRateLimit(key, 2, 1000, 2000).allowed).toBe(true);
  });
});
