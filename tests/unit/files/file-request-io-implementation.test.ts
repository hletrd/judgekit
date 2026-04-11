import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILE_REQUEST_SOURCES = [
  "src/app/api/v1/files/route.ts",
  "src/app/api/v1/files/[id]/route.ts",
  "src/app/api/v1/files/bulk-delete/route.ts",
  "src/lib/files/storage.ts",
  "src/lib/files/problem-links.ts",
  "src/lib/files/image-processing.ts",
];

const SYNC_FS_API_PATTERN =
  /\b(readFileSync|writeFileSync|existsSync|statSync|unlinkSync|rmSync|mkdirSync|readdirSync|copyFileSync|renameSync)\b/;

describe("file request I/O implementation guards", () => {
  it("keeps file request paths on async filesystem APIs", () => {
    for (const relativePath of FILE_REQUEST_SOURCES) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");
      expect(source, `${relativePath} should avoid sync fs APIs`).not.toMatch(SYNC_FS_API_PATTERN);
    }
  });
});
