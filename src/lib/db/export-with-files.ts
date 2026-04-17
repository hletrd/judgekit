import JSZip from "jszip";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { streamDatabaseExport, type JudgeKitExport } from "@/lib/db/export";
import { readUploadedFile, resolveStoredPath } from "@/lib/files/storage";
import { logger } from "@/lib/logger";
import { asc } from "drizzle-orm";
import { access } from "node:fs/promises";

/**
 * Export database + uploaded files as a ZIP archive.
 * The ZIP contains:
 *   database.json  – standard JudgeKitExport
 *   uploads/       – uploaded files keyed by their storedName
 */
export async function streamBackupWithFiles(signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  const zip = new JSZip();

  // 1. Collect database export as JSON
  const dbChunks: Uint8Array[] = [];
  const dbStream = streamDatabaseExport({ signal });

  const dbReader = dbStream.getReader();
  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { done, value } = await dbReader.read();
    if (done) break;
    dbChunks.push(value);
  }

  const dbJson = Buffer.concat(dbChunks).toString("utf-8");
  zip.file("database.json", dbJson);

  // 2. Collect file records from DB
  const fileRecords = await db
    .select({ storedName: files.storedName, originalName: files.originalName })
    .from(files)
    .orderBy(asc(files.createdAt));

  // 3. Add each file to the ZIP
  const uploadsFolder = zip.folder("uploads")!;
  let included = 0;
  let skipped = 0;

  for (const record of fileRecords) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      await access(resolveStoredPath(record.storedName));
      const buffer = await readUploadedFile(record.storedName);
      uploadsFolder.file(record.storedName, buffer);
      included++;
    } catch {
      // File may have been deleted from disk; skip silently
      skipped++;
    }
  }

  logger.info({ included, skipped, total: fileRecords.length }, "Backup file upload collection complete");

  // 4. Generate ZIP as a Web ReadableStream
  const blob = await zip.generateAsync({ type: "uint8array" }, (metadata) => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  });

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(blob);
      controller.close();
    },
  });
}
