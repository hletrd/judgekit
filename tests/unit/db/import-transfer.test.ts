import { describe, expect, it } from "vitest";
import { readUploadedJsonFileWithLimit, MAX_IMPORT_BYTES } from "@/lib/db/import-transfer";

describe("readUploadedJsonFileWithLimit", () => {
  it("parses valid JSON from a File", async () => {
    const json = JSON.stringify({ hello: "world" });
    const file = new File([json], "test.json", { type: "application/json" });
    const result = await readUploadedJsonFileWithLimit(file);
    expect(result).toEqual({ hello: "world" });
  });

  it("throws fileTooLarge when file size exceeds limit", async () => {
    // Create a file that exceeds the limit
    const largeContent = new Uint8Array(200);
    const file = new File([largeContent], "large.json", { type: "application/json" });
    await expect(readUploadedJsonFileWithLimit(file, 100)).rejects.toThrow("fileTooLarge");
  });

  it("throws invalidJson for malformed JSON", async () => {
    const file = new File(["{invalid json}"], "bad.json", { type: "application/json" });
    await expect(readUploadedJsonFileWithLimit(file)).rejects.toThrow("invalidJson");
  });

  it("handles multi-byte content correctly", async () => {
    const json = JSON.stringify({ text: "안녕하세요" });
    const file = new File([json], "korean.json", { type: "application/json" });
    const result = await readUploadedJsonFileWithLimit<{ text: string }>(file);
    expect(result.text).toBe("안녕하세요");
  });

  it("handles empty JSON object", async () => {
    const file = new File(["{}"], "empty.json", { type: "application/json" });
    const result = await readUploadedJsonFileWithLimit(file);
    expect(result).toEqual({});
  });

  it("handles JSON arrays", async () => {
    const json = JSON.stringify([1, 2, 3]);
    const file = new File([json], "array.json", { type: "application/json" });
    const result = await readUploadedJsonFileWithLimit<number[]>(file);
    expect(result).toEqual([1, 2, 3]);
  });

  it("respects custom byte limit", async () => {
    const json = JSON.stringify({ data: "x".repeat(50) });
    const file = new File([json], "test.json", { type: "application/json" });
    // The JSON string is longer than 10 bytes
    await expect(readUploadedJsonFileWithLimit(file, 10)).rejects.toThrow("fileTooLarge");
  });

  it("preserves numeric precision for floating point values", async () => {
    const json = JSON.stringify({ score: 99.5 });
    const file = new File([json], "float.json", { type: "application/json" });
    const result = await readUploadedJsonFileWithLimit<{ score: number }>(file);
    expect(result.score).toBe(99.5);
  });
});

describe("MAX_IMPORT_BYTES", () => {
  it("is set to 100 MB", () => {
    expect(MAX_IMPORT_BYTES).toBe(100 * 1024 * 1024);
  });
});
