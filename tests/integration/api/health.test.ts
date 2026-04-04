import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, hasSqliteIntegrationSupport, seedUser, type TestDb } from "../support";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";

describe.skipIf(!hasSqliteIntegrationSupport)("Integration DB health check", () => {
  let ctx: TestDb;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it("creates an in-memory database with all tables", () => {
    // Query sqlite_master to verify tables were created by migrations
    const tables = ctx.sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name"
      )
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("users");
    expect(tableNames).toContain("problems");
    expect(tableNames).toContain("submissions");
    expect(tableNames).toContain("test_cases");
    expect(tableNames).toContain("groups");
    expect(tableNames).toContain("enrollments");
    expect(tableNames).toContain("assignments");
    expect(tableNames).toContain("assignment_problems");
    expect(tableNames).toContain("sessions");
    expect(tableNames).toContain("accounts");
    expect(tableNames).toContain("login_events");
    expect(tableNames).toContain("audit_events");
    expect(tableNames).toContain("language_configs");
    expect(tableNames).toContain("system_settings");
    expect(tableNames).toContain("rate_limits");
    expect(tableNames).toContain("submission_results");
    expect(tableNames).toContain("submission_comments");
    expect(tableNames).toContain("score_overrides");
    expect(tableNames).toContain("problem_group_access");
  });

  it("supports basic insert and select via Drizzle", () => {
    const seeded = seedUser(ctx, { username: "healthcheck", name: "Health Check" });

    const found = ctx.db
      .select()
      .from(users)
      .where(eq(users.id, seeded.id))
      .get();

    expect(found).toBeDefined();
    expect(found!.username).toBe("healthcheck");
    expect(found!.name).toBe("Health Check");
  });

  it("enforces foreign keys", () => {
    // Inserting a session with a non-existent userId should fail
    expect(() => {
      ctx.sqlite
        .prepare(
          "INSERT INTO sessions (session_token, user_id, expires) VALUES (?, ?, ?)"
        )
        .run("tok-1", "nonexistent-user", Date.now());
    }).toThrow(/FOREIGN KEY/);
  });

  it("provides isolated databases per call", () => {
    seedUser(ctx, { username: "isolated" });

    const ctx2 = createTestDb();
    const rows = ctx2.db.select().from(users).all();
    expect(rows).toHaveLength(0);
    ctx2.cleanup();
  });
});
