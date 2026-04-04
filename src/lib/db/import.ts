/**
 * Portable database import engine.
 *
 * Imports data from a JudgeKitExport JSON into the current database,
 * handling type conversions between dialects.
 */

import { db, pool } from "./index";
import * as schema from "./schema";
import { validateExport, getReversedTableOrder, type JudgeKitExport } from "./export";
import { rawQueryOne } from "./queries";
import { logger } from "@/lib/logger";

/** Map of logical table names to Drizzle table references */
const TABLE_MAP: Record<string, any> = {
  users: schema.users,
  roles: schema.roles,
  tags: schema.tags,
  systemSettings: schema.systemSettings,
  judgeWorkers: schema.judgeWorkers,
  languageConfigs: schema.languageConfigs,
  plugins: schema.plugins,
  rateLimits: schema.rateLimits,
  sessions: schema.sessions,
  accounts: schema.accounts,
  loginEvents: schema.loginEvents,
  auditEvents: schema.auditEvents,
  apiKeys: schema.apiKeys,
  groups: schema.groups,
  problems: schema.problems,
  files: schema.files,
  problemSets: schema.problemSets,
  enrollments: schema.enrollments,
  testCases: schema.testCases,
  problemGroupAccess: schema.problemGroupAccess,
  assignments: schema.assignments,
  problemSetProblems: schema.problemSetProblems,
  problemSetGroupAccess: schema.problemSetGroupAccess,
  problemTags: schema.problemTags,
  chatMessages: schema.chatMessages,
  assignmentProblems: schema.assignmentProblems,
  examSessions: schema.examSessions,
  contestAccessTokens: schema.contestAccessTokens,
  submissions: schema.submissions,
  antiCheatEvents: schema.antiCheatEvents,
  scoreOverrides: schema.scoreOverrides,
  submissionResults: schema.submissionResults,
  submissionComments: schema.submissionComments,
};

/**
 * Columns that store timestamps.
 * Used to convert ISO strings back to dialect-appropriate values.
 */
const TIMESTAMP_COLUMNS = new Set([
  "createdAt", "updatedAt", "enrolledAt", "submittedAt", "judgedAt",
  "startedAt", "personalDeadline", "expiresAt", "expires", "startsAt",
  "deadline", "lateDeadline", "freezeLeaderboardAt", "redeemedAt",
  "lastActiveAt", "tokenInvalidatedAt", "lastSeenAt", "registeredAt",
  "lastUsedAt", "judgeClaimedAt", "uploadedAt",
]);

/**
 * Columns that store boolean values.
 * SQLite uses 0/1 integers, PG/MySQL use native booleans.
 */
const BOOLEAN_COLUMNS = new Set([
  "isActive", "mustChangePassword", "isBuiltin", "isVisible", "isEnabled",
  "enableAntiCheat", "showLeaderboard", "showSubmissions",
  "lectureMode", "aiAssistantEnabled",
]);

/**
 * Columns that store JSON values.
 * SQLite stores as stringified text, PG uses jsonb, MySQL uses json.
 */
const JSON_COLUMNS = new Set([
  "details", "capabilities", "config",
]);

export interface ImportResult {
  success: boolean;
  tablesImported: number;
  totalRowsImported: number;
  tableResults: Record<string, { imported: number; skipped: number }>;
  errors: string[];
}

/**
 * Convert a portable value back to the target dialect's format.
 */
function convertValue(val: unknown, colName: string): unknown {
  if (val === null || val === undefined) return null;

  // Timestamp columns: ISO string → Date
  if (TIMESTAMP_COLUMNS.has(colName) && typeof val === "string") {
    const date = new Date(val);
    if (isNaN(date.getTime())) return val;
    return date;
  }

  // Boolean columns
  if (BOOLEAN_COLUMNS.has(colName)) {
    return Boolean(val);
  }

  // JSON columns: parse string to native object for PostgreSQL jsonb
  if (JSON_COLUMNS.has(colName)) {
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }

  return val;
}

/**
 * Import data from a JudgeKitExport into the current database.
 *
 * WARNING: This REPLACES all data in the target database.
 */
export async function importDatabase(data: JudgeKitExport): Promise<ImportResult> {
  // Validate first
  const validationErrors = validateExport(data);
  if (validationErrors.length > 0) {
    return {
      success: false,
      tablesImported: 0,
      totalRowsImported: 0,
      tableResults: {},
      errors: validationErrors,
    };
  }

  const result: ImportResult = {
    success: true,
    tablesImported: 0,
    totalRowsImported: 0,
    tableResults: {},
    errors: [],
  };

  try {
    // Disable foreign key checks during import
    await disableForeignKeys();

    // Truncate all tables in reverse FK order (children first)
    const reverseOrder = getReversedTableOrder();
    for (const tableName of reverseOrder) {
      const table = TABLE_MAP[tableName];
      if (!table) continue;
      try {
        await db.delete(table);
      } catch (err: any) {
        logger.warn({ tableName, err: err.message }, "Failed to truncate table during import");
      }
    }

    // Import tables in FK order (parents first)
    for (const { name: tableName } of Object.entries(TABLE_MAP).map(([name]) => ({ name }))) {
      const tableData = data.tables[tableName];
      if (!tableData || tableData.rowCount === 0) {
        result.tableResults[tableName] = { imported: 0, skipped: 0 };
        continue;
      }

      const table = TABLE_MAP[tableName];
      if (!table) {
        result.errors.push(`Unknown table in import: ${tableName}`);
        continue;
      }

      const { columns, rows } = tableData;
      let imported = 0;
      let skipped = 0;

      // Insert in batches of 100 to avoid parameter limits
      const BATCH_SIZE = 100;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const values = batch.map((row) => {
          const obj: Record<string, unknown> = {};
          for (let j = 0; j < columns.length; j++) {
            obj[columns[j]] = convertValue(row[j], columns[j]);
          }
          return obj;
        });

        try {
          await db.insert(table).values(values);
          imported += values.length;
        } catch (err: any) {
          logger.error({ tableName, batch: i, err: err.message }, "Failed to insert batch");
          result.errors.push(`${tableName} batch ${i}: ${err.message}`);
          skipped += values.length;
        }
      }

      result.tableResults[tableName] = { imported, skipped };
      result.tablesImported++;
      result.totalRowsImported += imported;
    }

    // Re-enable foreign key checks
    await enableForeignKeys();

  } catch (err: any) {
    result.success = false;
    result.errors.push(`Import failed: ${err.message}`);
    // Try to re-enable FK checks
    try { await enableForeignKeys(); } catch { /* best effort */ }
  }

  return result;
}

async function disableForeignKeys(): Promise<void> {
  if (pool) await pool.query("SET CONSTRAINTS ALL DEFERRED");
}

async function enableForeignKeys(): Promise<void> {
  if (pool) await pool.query("SET CONSTRAINTS ALL IMMEDIATE");
}

/**
 * Get a summary of the current database (table names and row counts).
 * Useful for pre-import comparison.
 */
export async function getDatabaseSummary(): Promise<Record<string, number>> {
  const summary: Record<string, number> = {};
  for (const [name, table] of Object.entries(TABLE_MAP)) {
    try {
      const rows = await db.select().from(table);
      summary[name] = rows.length;
    } catch {
      summary[name] = -1; // error reading
    }
  }
  return summary;
}
