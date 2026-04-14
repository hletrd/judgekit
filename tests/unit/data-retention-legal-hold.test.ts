import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RETENTION_PATH = "src/lib/data-retention.ts";
const MAINTENANCE_PATH = "src/lib/data-retention-maintenance.ts";

describe("data retention legal hold", () => {
  it("data-retention.ts exports DATA_RETENTION_LEGAL_HOLD", () => {
    const source = readFileSync(join(process.cwd(), RETENTION_PATH), "utf8");
    expect(source).toContain("export const DATA_RETENTION_LEGAL_HOLD");
  });

  it("DATA_RETENTION_LEGAL_HOLD is driven by the DATA_RETENTION_LEGAL_HOLD env var", () => {
    const source = readFileSync(join(process.cwd(), RETENTION_PATH), "utf8");
    expect(source).toContain('process.env.DATA_RETENTION_LEGAL_HOLD');
    // Must check for "true" or "1" string values
    expect(source).toContain('"true"');
    expect(source).toContain('"1"');
  });

  it("data-retention-maintenance.ts imports DATA_RETENTION_LEGAL_HOLD", () => {
    const source = readFileSync(join(process.cwd(), MAINTENANCE_PATH), "utf8");
    expect(source).toContain("DATA_RETENTION_LEGAL_HOLD");
    expect(source).toContain("@/lib/data-retention");
  });

  it("pruneSensitiveOperationalData checks legal hold before pruning", () => {
    const source = readFileSync(join(process.cwd(), MAINTENANCE_PATH), "utf8");
    expect(source).toContain("DATA_RETENTION_LEGAL_HOLD");
    // The guard must appear inside pruneSensitiveOperationalData
    expect(source).toContain("pruneSensitiveOperationalData");
    expect(source).toMatch(/pruneSensitiveOperationalData[\s\S]*?DATA_RETENTION_LEGAL_HOLD/);
  });

  it("maintenance function returns early when legal hold is active", () => {
    const source = readFileSync(join(process.cwd(), MAINTENANCE_PATH), "utf8");
    // early return pattern: if (DATA_RETENTION_LEGAL_HOLD) { ... return; }
    expect(source).toMatch(/if\s*\(\s*DATA_RETENTION_LEGAL_HOLD\s*\)[\s\S]*?return/);
  });

  it("legal hold log message mentions skipping pruning", () => {
    const source = readFileSync(join(process.cwd(), MAINTENANCE_PATH), "utf8");
    expect(source).toMatch(/legal hold/i);
  });
});
