import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTE_PATH = "src/app/api/v1/plugins/chat-widget/chat/route.ts";
const SCHEMA_PATH = "src/lib/db/schema.pg.ts";

describe("chat completion status tracking", () => {
  it("schema defines completionStatus column on chatMessages table", () => {
    const source = readFileSync(join(process.cwd(), SCHEMA_PATH), "utf8");
    expect(source).toContain("completionStatus");
    expect(source).toMatch(/completion_status/);
  });

  it("persistChatMessage accepts a completionStatus field", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).toContain("completionStatus");
    // The function signature must include completionStatus
    expect(source).toMatch(/completionStatus\??\s*:/);
  });

  it("simple stream path tracks streamCompleted flag", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).toContain("streamCompleted");
    expect(source).toContain("streamCompleted = true");
  });

  it("tool-calling fallback stream path tracks finalStreamCompleted flag", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).toContain("finalStreamCompleted");
    expect(source).toContain("finalStreamCompleted = true");
  });

  it("persists completionStatus as 'complete' when stream finishes normally", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).toContain('"complete"');
    // streamCompleted ? "complete" : ...
    expect(source).toMatch(/streamCompleted\s*\?\s*["']complete["']/);
  });

  it("persists completionStatus as 'partial' when stream is interrupted mid-content", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).toContain('"partial"');
    expect(source).toMatch(/assistantContent\s*\?\s*["']partial["']/);
  });

  it("persists completionStatus as 'error' when stream fails with no content", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).toContain('"error"');
  });

  it("completionStatus is passed to persistChatMessage in the simple stream path", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    // The call to persistChatMessage must include completionStatus
    expect(source).toMatch(/persistChatMessage\s*\(\s*\{[\s\S]*?completionStatus:/);
  });

  it("buildLoggedStreamingResponse uses complete vs partial based on stream outcome", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).toContain("buildLoggedStreamingResponse");
    expect(source).toContain("persistAssistantMessage");
    expect(source).toMatch(/completed\s*\?\s*["']complete["']\s*:\s*["']partial["']/);
  });
});
