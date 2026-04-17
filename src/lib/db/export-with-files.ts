import JSZip from "jszip";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { streamDatabaseExport, type JudgeKitExport } from "@/lib/db/export";
import { readUploadedFile, resolveStoredPath, writeUploadedFile, ensureUploadsDir } from "@/lib/files/storage";
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
    void metadata;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  });

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(blob);
      controller.close();
    },
  });
}

/**
 * Restore uploaded files and extract database.json from a ZIP backup archive.
 *
 * @param zipBuffer - The ZIP file content as a Buffer
 * @returns The parsed database export and count of restored files
 */
export async function restoreFilesFromZip(zipBuffer: Buffer): Promise<{
  dbExport: JudgeKitExport;
  filesRestored: number;
}> {
  const zip = await JSZip.loadAsync(zipBuffer);

  // 1. Extract database.json
  const dbEntry = zip.file("database.json");
  if (!dbEntry) {
    throw new Error("missingDatabaseJson");
  }

  const dbJson = await dbEntry.async("text");
  let dbExport: JudgeKitExport;
  try {
    dbExport = JSON.parse(dbJson);
  } catch {
    throw new Error("invalidDatabaseJson");
  }

  // 2. Extract uploaded files to disk
  await ensureUploadsDir();
  let filesRestored = 0;

  const fileEntries = zip.filter(
    (relativePath) => relativePath.startsWith("uploads/") && !relativePath.endsWith("/")
  );

  for (const entry of fileEntries) {
    const storedName = entry.name.slice("uploads/".length);
    if (!storedName) continue;

    // Validate: no path traversal
    if (storedName.includes("/") || storedName.includes("\\") || storedName.includes("..")) {
      logger.warn({ storedName }, "Skipping file with invalid name in backup ZIP");
      continue;
    }

    const buffer = await entry.async("nodebuffer");
    await writeUploadedFile(storedName, buffer);
    filesRestored++;
  }

  logger.info({ filesRestored }, "Restored uploaded files from backup ZIP");

  return { dbExport, filesRestored };
}
