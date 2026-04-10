import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally
global.fetch = vi.fn();

async function importRateLimiterClient() {
  // Reset modules to clear module-level state (consecutiveFailures, circuitOpenUntil)
  vi.resetModules();
  vi.clearAllMocks();
  // Clear the global fetch mock
  (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  // The sidecar is only used when RATE_LIMITER_URL is set
  process.env.RATE_LIMITER_URL = "http://rate-limiter-test:3001";
  return import("@/lib/security/rate-limiter-client");
}

afterEach(() => {
  delete process.env.RATE_LIMITER_URL;
});

describe("rate-limiter-client", () => {
  describe("circuit breaker - consecutiveFailures reset", () => {
    it("resets consecutiveFailures on valid JSON response", async () => {
      const { checkRateLimit, isRateLimiterDegraded } =
        await importRateLimiterClient();

      // First, induce failures to open circuit
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));
      await checkRateLimit("test-key");
      await checkRateLimit("test-key");
      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(true);

      // Advance time past the recovery window (30s)
      const originalDateNow = Date.now;
      vi.spyOn(Date, "now").mockReturnValue(originalDateNow() + 31_000);

      // Now test that a valid JSON response resets the failure count
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: true, remaining: 10, retryAfter: null }),
      });

      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(false);

      vi.restoreAllMocks();
    });

    it("does NOT reset consecutiveFailures when response data is null", async () => {
      const { checkRateLimit, isRateLimiterDegraded } =
        await importRateLimiterClient();

      // First, induce failures to open circuit
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));
      await checkRateLimit("test-key");
      await checkRateLimit("test-key");
      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(true);

      // H-10: Null response data should NOT reset consecutiveFailures
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      await checkRateLimit("test-key");
      // Circuit should still be degraded because null data didn't reset failures
      expect(isRateLimiterDegraded()).toBe(true);
    });

    it("does NOT reset consecutiveFailures when response data is undefined", async () => {
      const { checkRateLimit, isRateLimiterDegraded } =
        await importRateLimiterClient();

      // First, induce failures to open circuit
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));
      await checkRateLimit("test-key");
      await checkRateLimit("test-key");
      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(true);

      // H-10: Undefined response data should NOT reset consecutiveFailures
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => undefined,
      });

      await checkRateLimit("test-key");
      // Circuit should still be degraded because undefined data didn't reset failures
      expect(isRateLimiterDegraded()).toBe(true);
    });
  });

  describe("circuit breaker - failure handling", () => {
    it("opens circuit after 3 consecutive network failures", async () => {
      const { checkRateLimit, isRateLimiterDegraded } =
        await importRateLimiterClient();

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(false);

      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(false);

      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(true);
    });

    it("opens circuit after 3 consecutive non-OK responses", async () => {
      const { checkRateLimit, isRateLimiterDegraded } =
        await importRateLimiterClient();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(false);

      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(false);

      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(true);
    });
  });

  describe("circuit breaker - recovery attempt", () => {
    it("attempts recovery after circuit window expires", async () => {
      const { checkRateLimit, isRateLimiterDegraded } =
        await importRateLimiterClient();

      // Open the circuit
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      await checkRateLimit("test-key");
      await checkRateLimit("test-key");
      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(true);

      // Mock Date.now to advance past recovery window (30s)
      const originalDateNow = Date.now;
      vi.spyOn(Date, "now").mockReturnValue(originalDateNow() + 31_000);

      // Recovery attempt - should try fetch and succeed
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: true, remaining: 10, retryAfter: null }),
      });

      await checkRateLimit("test-key");
      expect(isRateLimiterDegraded()).toBe(false);

      vi.restoreAllMocks();
    });
  });

  describe("recordRateLimitFailure", () => {
    it("returns failure result from rate limiter", async () => {
      const { recordRateLimitFailure } = await importRateLimiterClient();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ blocked: false, blockedUntil: null }),
      });

      const result = await recordRateLimitFailure("test-key");
      expect(result).toEqual({ blocked: false, blockedUntil: null });
    });

    it("returns null when rate limiter is unreachable so caller can fall back to DB", async () => {
      const { recordRateLimitFailure } = await importRateLimiterClient();

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      const result = await recordRateLimitFailure("test-key");
      // Must be null, not a synthetic {blocked:false} — that would silently
      // mask sidecar outages and let attackers skip the counter.
      expect(result).toBeNull();
    });
  });

  describe("resetRateLimit", () => {
    it("calls rate limiter to reset", async () => {
      const { resetRateLimit } = await importRateLimiterClient();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(resetRateLimit("test-key")).resolves.toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/reset"),
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        })
      );
    });
  });

  describe("checkRateLimit fallback behavior", () => {
    it("returns null on network failure so the caller falls back to the DB path", async () => {
      const { checkRateLimit } = await importRateLimiterClient();

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      // Previously this synthesized a fail-closed `{ allowed: false }`, which
      // turned sidecar outages into self-inflicted denials of service. The
      // contract is now: unreachable sidecar returns null and the caller
      // decides via the authoritative DB-backed limiter.
      await expect(checkRateLimit("test-key")).resolves.toBeNull();
    });

    it("returns a non-null result from a healthy sidecar", async () => {
      const { checkRateLimit } = await importRateLimiterClient();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: true, remaining: 9, retryAfter: null }),
      });

      const result = await checkRateLimit("test-key");
      expect(result).toEqual({ allowed: true, remaining: 9, retryAfter: null });
    });
  });

  describe("sidecar not configured", () => {
    it("short-circuits without touching fetch when RATE_LIMITER_URL is unset", async () => {
      vi.resetModules();
      vi.clearAllMocks();
      (global.fetch as ReturnType<typeof vi.fn>).mockReset();
      delete process.env.RATE_LIMITER_URL;

      const {
        checkRateLimit,
        recordRateLimitFailure,
        resetRateLimit,
        isRateLimiterDegraded,
      } = await import("@/lib/security/rate-limiter-client");

      await expect(checkRateLimit("test-key")).resolves.toBeNull();
      await expect(recordRateLimitFailure("test-key")).resolves.toBeNull();
      await expect(resetRateLimit("test-key")).resolves.toBeUndefined();

      // Unconfigured is not "degraded" — it just means the caller uses the
      // DB path directly. We don't want the degraded banner to flip on a
      // deployment that intentionally has no sidecar.
      expect(isRateLimiterDegraded()).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
