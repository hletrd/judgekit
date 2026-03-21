import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import * as sqliteSchema from "@/lib/db/schema";
import * as pgSchema from "@/lib/db/schema.pg";
import * as mysqlSchema from "@/lib/db/schema.mysql";

/**
 * Verify that all three schema variants define the same tables
 * with the same column names. This catches drift when one schema
 * is updated but the others are not.
 */

function getExportedTables(schemaModule: Record<string, unknown>) {
  const tables: Record<string, { tableName: string; columns: string[] }> = {};

  for (const [exportName, value] of Object.entries(schemaModule)) {
    if (value && typeof value === "object" && Symbol.for("drizzle:Name") in (value as any)) {
      try {
        const tableName = getTableName(value as any);
        const columns = Object.keys(getTableColumns(value as any)).sort();
        tables[exportName] = { tableName, columns };
      } catch {
        // Not a table, skip
      }
    }
  }

  return tables;
}

describe("Schema Parity", () => {
  const sqliteTables = getExportedTables(sqliteSchema as any);
  const pgTables = getExportedTables(pgSchema as any);
  const mysqlTables = getExportedTables(mysqlSchema as any);

  it("should have the same number of table exports", () => {
    const sqliteCount = Object.keys(sqliteTables).length;
    const pgCount = Object.keys(pgTables).length;
    const mysqlCount = Object.keys(mysqlTables).length;

    expect(pgCount).toBe(sqliteCount);
    expect(mysqlCount).toBe(sqliteCount);
  });

  it("should export tables with the same names", () => {
    const sqliteExportNames = Object.keys(sqliteTables).sort();
    const pgExportNames = Object.keys(pgTables).sort();
    const mysqlExportNames = Object.keys(mysqlTables).sort();

    expect(pgExportNames).toEqual(sqliteExportNames);
    expect(mysqlExportNames).toEqual(sqliteExportNames);
  });

  for (const [exportName, sqliteTable] of Object.entries(sqliteTables)) {
    describe(`table: ${exportName} (${sqliteTable.tableName})`, () => {
      it("PostgreSQL has matching table name", () => {
        expect(pgTables[exportName]).toBeDefined();
        expect(pgTables[exportName].tableName).toBe(sqliteTable.tableName);
      });

      it("MySQL has matching table name", () => {
        expect(mysqlTables[exportName]).toBeDefined();
        expect(mysqlTables[exportName].tableName).toBe(sqliteTable.tableName);
      });

      it("PostgreSQL has the same columns", () => {
        expect(pgTables[exportName].columns).toEqual(sqliteTable.columns);
      });

      it("MySQL has the same columns", () => {
        expect(mysqlTables[exportName].columns).toEqual(sqliteTable.columns);
      });
    });
  }
});
