import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("admin workers audit implementation", () => {
  it("shows an audit notice on the workers page", () => {
    const source = read("src/app/(dashboard)/dashboard/admin/workers/page.tsx");

    expect(source).toContain('t("auditNotice")');
  });

  it("records audit events for worker inventory and stats reads", () => {
    const inventoryRoute = read("src/app/api/v1/admin/workers/route.ts");
    const statsRoute = read("src/app/api/v1/admin/workers/stats/route.ts");

    expect(inventoryRoute).toContain('recordAuditEvent({');
    expect(inventoryRoute).toContain('action: "worker_inventory.viewed"');
    expect(statsRoute).toContain('recordAuditEvent({');
    expect(statsRoute).toContain('action: "worker_stats.viewed"');
  });
});
