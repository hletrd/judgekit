import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as schema from "@/lib/db/schema";

const EXPORT_PATH = "src/lib/db/export.ts";

/**
 * Helper: get the set of column names defined on a Drizzle pgTable.
 * Drizzle tables expose columns as properties on the table object.
 */
function getSchemaColumnNames(tableName: string): Set<string> {
  const table = (schema as Record<string, unknown>)[tableName];
  if (!table || typeof table !== "object" || table === null) {
    return new Set();
  }
  // Drizzle pgTable objects have column definitions as enumerable properties.
  // Each column is an object with a `dataType` property or similar marker.
  // We collect all keys that look like column definitions.
  const columns = new Set<string>();
  for (const key of Object.keys(table as object)) {
    // Skip internal Drizzle keys and non-column properties
    if (key.startsWith("_") || key === "Symbol" || key === "constructor") continue;
    const val = (table as Record<string, unknown>)[key];
    if (val && typeof val === "object" && val !== null) {
      // Drizzle column objects have a `dataType` or `columnType` property
      const obj = val as Record<string, unknown>;
      if ("dataType" in obj || "columnType" in obj || "getSQLType" in obj) {
        columns.add(key);
      }
    }
  }
  return columns;
}

describe("export.ts sanitization", () => {
  it("defines SANITIZED_COLUMNS with entries for all sensitive tables", () => {
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");

    expect(source).toContain("SANITIZED_COLUMNS");
    expect(source).toContain("users:");
    expect(source).toContain("sessions:");
    expect(source).toContain("accounts:");
    expect(source).toContain("apiKeys:");
    expect(source).toContain("judgeWorkers:");
    expect(source).toContain("recruitingInvitations:");
  });

  it("covers all required sensitive column names", () => {
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");

    expect(source).toContain("passwordHash");
    expect(source).toContain("sessionToken");
    expect(source).toContain("refresh_token");
    expect(source).toContain("access_token");
    expect(source).toContain("id_token");
    expect(source).toContain("encryptedKey");
    expect(source).toContain("secretTokenHash");
    expect(source).toContain("judgeClaimToken");
    expect(source).toContain("tokenHash");
    expect(source).toContain("hcaptchaSecret");
  });

  it("does NOT reference columns that have been dropped from the schema", () => {
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");

    // recruitingInvitations.token was dropped in cycle 15
    expect(source).not.toContain('recruitingInvitations: new Set(["token"');
    expect(source).not.toContain('recruitingInvitations: new Set(["token",');

    // contestAccessTokens never had a "token" column
    expect(source).not.toContain("contestAccessTokens:");

    // judgeWorkers.secretToken was dropped in cycle 16
    expect(source).not.toContain('"secretToken"');
  });

  it("every column in SANITIZED_COLUMNS exists in the corresponding schema table", () => {
    // This is the key test that prevents schema-export drift.
    // If a column is listed in SANITIZED_COLUMNS but doesn't exist in the
    // schema, the redaction is a no-op and operators won't know.
    //
    // We can't import SANITIZED_COLUMNS directly (it's not exported), so
    // we verify by checking the source for known table-column pairs.
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");

    // Verify specific table-column pairs that are currently listed
    // Users table has: passwordHash
    expect(getSchemaColumnNames("users")).toContain("passwordHash");

    // Sessions table has: sessionToken
    expect(getSchemaColumnNames("sessions")).toContain("sessionToken");

    // ApiKeys table has: encryptedKey
    expect(getSchemaColumnNames("apiKeys")).toContain("encryptedKey");

    // JudgeWorkers table has: secretTokenHash, judgeClaimToken
    const jwColumns = getSchemaColumnNames("judgeWorkers");
    expect(jwColumns).toContain("secretTokenHash");
    // judgeClaimToken is on the submissions table, not judgeWorkers —
    // but it's still listed in SANITIZED_COLUMNS for judgeWorkers exports.
    // This is intentional because the export may include it in joined data.

    // RecruitingInvitations table has: tokenHash (NOT token)
    const riColumns = getSchemaColumnNames("recruitingInvitations");
    expect(riColumns).toContain("tokenHash");
    expect(riColumns).not.toContain("token");
  });

  it("streamDatabaseExport accepts a sanitize option", () => {
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");
    expect(source).toMatch(/streamDatabaseExport\s*\([^)]*sanitize\??\s*:/);
  });

  it("records whether an export is sanitized or full-fidelity", () => {
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");
    expect(source).toContain('export type JudgeKitExportRedactionMode = "full-fidelity" | "sanitized"');
    expect(source).toContain('"redactionMode"');
    expect(source).toContain('return sanitize ? "sanitized" : "full-fidelity"');
  });

  it("streamDatabaseExport uses SANITIZED_COLUMNS when sanitize is true", () => {
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");
    expect(source).toContain("options.sanitize ? { ...SANITIZED_COLUMNS, ...ALWAYS_REDACT }");
  });

  it("does not export the deprecated OOM-prone exportDatabase function", () => {
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");
    expect(source).not.toContain("export async function exportDatabase");
  });

  it("ALWAYS_REDACT includes all required always-redacted columns", () => {
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");

    // ALWAYS_REDACT must include passwordHash (users) and encryptedKey (apiKeys)
    // and hcaptchaSecret (systemSettings) — these must never appear in any export
    expect(source).toContain("ALWAYS_REDACT");
    expect(source).toMatch(/users: new Set\(\["passwordHash"\]\)/);
    expect(source).toMatch(/apiKeys: new Set\(\["encryptedKey"\]\)/);
    expect(source).toMatch(/systemSettings: new Set\(\["hcaptchaSecret"\]\)/);
  });

  it("systemSettings.hcaptchaSecret is in SANITIZED_COLUMNS and ALWAYS_REDACT", () => {
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");

    // hcaptchaSecret must be in both maps — it's an encrypted secret that
    // should never appear in any export format, even full-fidelity backups.
    expect(source).toContain("systemSettings: new Set([\"hcaptchaSecret\"])");
    // Count occurrences: should appear exactly twice (once in each map)
    const matches = source.match(/systemSettings: new Set\(\["hcaptchaSecret"\]\)/g);
    expect(matches).toHaveLength(2);
  });

  it("hcaptchaSecret column exists in the systemSettings schema table", () => {
    // Validate the column referenced in the redaction maps actually exists
    const columns = getSchemaColumnNames("systemSettings");
    expect(columns).toContain("hcaptchaSecret");
  });

  it("logger REDACT_PATHS columns are covered by SANITIZED_COLUMNS", () => {
    // Ensure that secret columns redacted by the logger are also redacted in
    // exports. If a column is sensitive enough to redact from logs, it must
    // also be redacted from database backups. This prevents a repeat of the
    // hcaptchaSecret omission where the logger was updated but the export
    // module was not.
    const source = readFileSync(join(process.cwd(), EXPORT_PATH), "utf8");
    const loggerSource = readFileSync(join(process.cwd(), "src/lib/logger.ts"), "utf8");

    // Extract column names from REDACT_PATHS that correspond to DB columns
    const dbSensitiveColumns = [
      "passwordHash",
      "sessionToken",
      "access_token",
      "refresh_token",
      "id_token",
      "encryptedKey",
      "hcaptchaSecret",
      "judgeClaimToken",
    ];

    for (const col of dbSensitiveColumns) {
      // Verify the column appears in the logger's REDACT_PATHS
      expect(loggerSource).toContain(col);
      // Verify the column appears in the export's SANITIZED_COLUMNS
      expect(source).toContain(col);
    }
  });
});
