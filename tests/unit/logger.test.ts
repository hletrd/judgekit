import { PassThrough } from "node:stream";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createLogger } from "@/lib/logger";

function waitForFlush() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("logger redaction", () => {
  it("redacts bearer auth and password-like fields from structured logs", async () => {
    const stream = new PassThrough();
    let output = "";
    stream.on("data", (chunk) => {
      output += chunk.toString();
    });

    const logger = createLogger(stream);
    logger.info({
      headers: { authorization: "Bearer super-secret-token" },
      password: "super-secret-password",
      workerSecret: "worker-secret-value",
      nested: {
        note: "still-visible",
      },
    }, "structured log");

    await waitForFlush();

    const line = output.trim();
    expect(line).not.toContain("super-secret-token");
    expect(line).not.toContain("super-secret-password");
    expect(line).not.toContain("worker-secret-value");

    const parsed = JSON.parse(line) as {
      headers: { authorization: string };
      password: string;
      workerSecret: string;
      nested: { note: string };
    };

    expect(parsed.headers.authorization).toBe("[REDACTED]");
    expect(parsed.password).toBe("[REDACTED]");
    expect(parsed.workerSecret).toBe("[REDACTED]");
    expect(parsed.nested.note).toBe("still-visible");
  });
});

describe("REDACT_PATHS coverage", () => {
  const LOGGER_PATH = "src/lib/logger.ts";
  const EXPORT_PATH = "src/lib/db/export.ts";

  /**
   * Secret columns that must be covered by logger REDACT_PATHS.
   * Derived from SANITIZED_COLUMNS + ALWAYS_REDACT in export.ts,
   * plus known secret fields that are handled in plaintext before
   * encryption (e.g. hcaptchaSecret in system settings).
   */
  const REQUIRED_REDACT_ENTRIES = [
    // From SANITIZED_COLUMNS / ALWAYS_REDACT
    "passwordHash",
    "sessionToken",
    "encryptedKey",
    // Known secret fields handled in plaintext before encryption
    "hcaptchaSecret",
    // Auth-related secrets
    "judgeClaimToken",
    "access_token",
    "refresh_token",
    "id_token",
  ];

  it("includes all known secret column names in REDACT_PATHS", () => {
    const source = readFileSync(join(process.cwd(), LOGGER_PATH), "utf8");

    for (const entry of REQUIRED_REDACT_ENTRIES) {
      expect(
        source.includes(`"${entry}"`),
        `REDACT_PATHS should include "${entry}"`
      ).toBe(true);
    }
  });

  it("includes body-prefixed variants for form-submitted secrets", () => {
    const source = readFileSync(join(process.cwd(), LOGGER_PATH), "utf8");

    // Secrets that arrive via form body in server actions
    const bodyPrefixed = ["body.passwordHash", "body.hcaptchaSecret"];
    for (const entry of bodyPrefixed) {
      expect(
        source.includes(`"${entry}"`),
        `REDACT_PATHS should include "${entry}"`
      ).toBe(true);
    }
  });

  it("keeps SANITIZED_COLUMNS and REDACT_PATHS in sync", () => {
    const exportSource = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");
    const loggerSource = readFileSync(join(process.cwd(), LOGGER_PATH), "utf8");

    // Columns that are hashes, not secrets — they don't need logger redaction
    // because they are one-way hashes (not reversible to plaintext).
    const HASH_COLUMNS = new Set(["secretTokenHash", "tokenHash"]);

    // Extract column names from SANITIZED_COLUMNS in export.ts
    const sanitizedMatch = exportSource.match(/SANITIZED_COLUMNS[^}]*\{([^}]*)\}/s);
    if (sanitizedMatch) {
      const columnNames = sanitizedMatch[1].match(/"(\w+)"/g) ?? [];
      for (const col of columnNames) {
        const name = col.replace(/"/g, "");
        // Hash columns are redacted from exports but don't need logger redaction
        // (they are not reversible to plaintext secrets)
        if (HASH_COLUMNS.has(name)) continue;
        // Each non-hash column in SANITIZED_COLUMNS should be covered by
        // REDACT_PATHS (either directly or via a body- prefix)
        const hasDirect = loggerSource.includes(`"${name}"`);
        expect(
          hasDirect,
          `REDACT_PATHS should cover SANITIZED_COLUMNS entry "${name}"`
        ).toBe(true);
      }
    }
  });
});
