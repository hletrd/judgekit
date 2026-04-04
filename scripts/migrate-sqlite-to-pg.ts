#!/usr/bin/env tsx
/**
 * SQLite → PostgreSQL Data Migration Script
 *
 * Exports all data from the current SQLite database to a portable JSON file
 * that can be imported into a PostgreSQL instance via the admin API.
 *
 * Usage:
 *   # 1. Export from SQLite (run while SQLite instance is up, or directly)
 *   DATABASE_PATH=./data/judge.db tsx scripts/migrate-sqlite-to-pg.ts export
 *
 *   # 2. Import into PostgreSQL (run against the new PG instance)
 *   curl -X POST http://localhost:3100/api/v1/admin/migrate/import \
 *     -H "Content-Type: application/json" \
 *     -H "Cookie: <admin-session-cookie>" \
 *     -d @data/export.json
 *
 *   Or use this script to import directly:
 *   DB_DIALECT=postgresql DATABASE_URL=postgres://... tsx scripts/migrate-sqlite-to-pg.ts import
 */

import fs from "fs";
import path from "path";

const command = process.argv[2] ?? "export";
const outputPath = process.argv[3] ?? path.join(process.cwd(), "data", "export.json");

async function doExport() {
  // Force SQLite dialect for export
  process.env.DB_DIALECT = "sqlite";
  process.env.DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/judge.db";

  const dbPath = path.resolve(process.env.DATABASE_PATH);
  if (!fs.existsSync(dbPath)) {
    console.error(`SQLite database not found at: ${dbPath}`);
    process.exit(1);
  }

  console.log(`Exporting from SQLite database: ${dbPath}`);

  const { exportDatabase } = await import("../src/lib/db/export");
  const data = await exportDatabase();

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`\nExport complete:`);
  console.log(`  File: ${outputPath}`);
  console.log(`  Size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Source dialect: ${data.sourceDialect}`);
  console.log(`  Tables: ${Object.keys(data.tables).length}`);

  let totalRows = 0;
  for (const [name, table] of Object.entries(data.tables)) {
    if (table.rowCount > 0) {
      console.log(`    ${name}: ${table.rowCount} rows`);
    }
    totalRows += table.rowCount;
  }
  console.log(`  Total rows: ${totalRows}`);

  console.log(`\nNext steps:`);
  console.log(`  1. Start the PostgreSQL stack:`);
  console.log(`     docker compose -f docker-compose.production.yml up -d`);
  console.log(`  2. Push schema to PostgreSQL:`);
  console.log(`     DB_DIALECT=postgresql DATABASE_URL=postgres://... npx drizzle-kit push`);
  console.log(`  3. Import data (option A — via API):`);
  console.log(`     curl -X POST http://localhost:3100/api/v1/admin/migrate/import \\`);
  console.log(`       -H "Content-Type: application/json" \\`);
  console.log(`       -H "Cookie: <admin-session-cookie>" \\`);
  console.log(`       -d @${outputPath}`);
  console.log(`  4. Or import directly (option B — via script):`);
  console.log(`     DB_DIALECT=postgresql DATABASE_URL=postgres://... tsx scripts/migrate-sqlite-to-pg.ts import`);
}

async function doImport() {
  if (!fs.existsSync(outputPath)) {
    console.error(`Export file not found at: ${outputPath}`);
    console.error(`Run the export step first: tsx scripts/migrate-sqlite-to-pg.ts export`);
    process.exit(1);
  }

  const dialect = process.env.DB_DIALECT;
  if (dialect !== "postgresql") {
    console.error(`DB_DIALECT must be "postgresql" for import (got: "${dialect ?? "not set"}")`);
    console.error(`Usage: DB_DIALECT=postgresql DATABASE_URL=postgres://... tsx scripts/migrate-sqlite-to-pg.ts import`);
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error(`DATABASE_URL is required for PostgreSQL import`);
    process.exit(1);
  }

  console.log(`Loading export from: ${outputPath}`);
  const data = JSON.parse(fs.readFileSync(outputPath, "utf-8"));

  console.log(`Importing into PostgreSQL at: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

  const { importDatabase } = await import("../src/lib/db/import");
  const result = await importDatabase(data);

  if (result.success) {
    console.log(`\nImport successful:`);
    console.log(`  Tables imported: ${result.tablesImported}`);
    console.log(`  Total rows imported: ${result.totalRowsImported}`);
    for (const [name, stats] of Object.entries(result.tableResults)) {
      if (stats.imported > 0 || stats.skipped > 0) {
        console.log(`    ${name}: ${stats.imported} imported, ${stats.skipped} skipped`);
      }
    }
  } else {
    console.error(`\nImport failed:`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  if (result.errors.length > 0) {
    console.warn(`\nWarnings:`);
    for (const err of result.errors) {
      console.warn(`  - ${err}`);
    }
  }
}

switch (command) {
  case "export":
    await doExport();
    break;
  case "import":
    await doImport();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error(`Usage: tsx scripts/migrate-sqlite-to-pg.ts [export|import] [path]`);
    process.exit(1);
}
