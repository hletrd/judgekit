# Plan: Multi-Database Backend Support

**Status**: Long-term / Not started
**Goal**: Support SQLite (default), PostgreSQL, and MariaDB as optional database backends via Drizzle ORM's multi-dialect support.

---

## Motivation

SQLite is excellent for single-server deployments but doesn't scale to multi-instance or high-concurrency production setups. Supporting PostgreSQL and MariaDB enables:
- Horizontal scaling (multiple app instances sharing one DB)
- Managed database services (AWS RDS, Cloud SQL, PlanetScale)
- Enterprise deployment requirements

## Current State

- **ORM**: Drizzle ORM 0.45 (already supports sqlite, pg, mysql dialects)
- **Driver**: `better-sqlite3` (synchronous, single-process)
- **Schema**: `drizzle-orm/sqlite-core` (`sqliteTable`, integer timestamps, text JSON)
- **Raw SQL**: 11 files use `sqlite.prepare()` for complex queries (CTEs, window functions, atomic UPDATE...RETURNING)
- **SQLite-specific functions**: `unixepoch('now')` (2 files), `json_extract()` (1 file), `INSERT OR IGNORE` (1 file)
- **PRAGMAs**: `busy_timeout`, `journal_mode = WAL`, `foreign_keys = ON`

## Migration Strategy

### Phase 1: Abstract the Database Layer

1. **Create `src/lib/db/dialect.ts`** — runtime dialect detection from env var (`DB_DIALECT=sqlite|postgres|mysql`)
2. **Create `src/lib/db/connection.ts`** — factory that returns the correct Drizzle instance:
   - `sqlite` → `better-sqlite3` + `drizzle(sqlite)`
   - `postgres` → `pg` or `postgres.js` + `drizzle(pool)`
   - `mysql` → `mysql2` + `drizzle(connection)`
3. **Export a unified `db` instance** that all application code imports (same as today)

### Phase 2: Dual Schema Definitions

Drizzle requires separate table definitions per dialect (`sqliteTable` vs `pgTable` vs `mysqlTable`). Two approaches:

**Option A: Schema generator** (recommended)
- Write schema once in a dialect-neutral DSL
- Generate `schema-sqlite.ts`, `schema-pg.ts`, `schema-mysql.ts` at build time
- Alias the active one as `schema.ts`

**Option B: Shared schema with conditionals**
- Use a wrapper function: `createTable(name, columns)` that calls the right dialect-specific function
- More runtime complexity but no code generation

### Phase 3: Replace SQLite-Specific SQL

| SQLite Feature | PostgreSQL Equivalent | MariaDB Equivalent |
|---|---|---|
| `unixepoch('now')` | `EXTRACT(EPOCH FROM NOW())::bigint` | `UNIX_TIMESTAMP()` |
| `json_extract(col, '$.key')` | `col->>'key'` (native JSONB) | `JSON_EXTRACT(col, '$.key')` |
| `INSERT OR IGNORE` | `INSERT ... ON CONFLICT DO NOTHING` | `INSERT IGNORE` |
| `UPDATE...RETURNING` | Native support | Not supported (need SELECT after UPDATE) |
| `rowid` | Use explicit serial PK or `ctid` | Use explicit auto-increment PK |
| `integer("col", { mode: "timestamp" })` | `timestamp("col")` | `timestamp("col")` |
| `text("col", { mode: "json" })` | `jsonb("col")` | `json("col")` |

**Action items:**
- Create a `src/lib/db/sql-helpers.ts` with dialect-aware helper functions:
  ```typescript
  export function nowEpoch() { /* returns dialect-appropriate SQL */ }
  export function jsonExtract(col, path) { /* ... */ }
  ```
- Replace all 11 raw SQL files to use helpers instead of hardcoded SQLite functions

### Phase 4: Replace Raw SQL with Drizzle ORM

Priority order (hardest → easiest):

1. **`judge/claim/route.ts`** — Atomic UPDATE...RETURNING (critical for correctness)
   - PostgreSQL: native UPDATE...RETURNING
   - MariaDB: transaction with SELECT FOR UPDATE + UPDATE + SELECT
   - Keep raw SQL but make it dialect-aware

2. **`assignments/contest-scoring.ts`** — Complex CTEs with window functions
   - CTEs and `ROW_NUMBER()` work in all three databases
   - Replace `unixepoch()` calls with helper

3. **`assignments/submissions.ts`** — CTEs with window functions
   - Same approach as contest-scoring

4. **`assignments/contests.ts`** — Uses `unixepoch('now')` in ORDER BY
   - Replace with helper function

5. **`admin/audit-logs/page.tsx`** — Uses `json_extract()`
   - Replace with helper

6. **Other files** (leaderboard, code-similarity, exam-sessions, contest-analytics, rate-limit)
   - Mostly standard SQL, just need transaction wrapper changes

### Phase 5: Migration System

- Use Drizzle Kit's `generate` command per dialect
- Store migrations in `drizzle/sqlite/`, `drizzle/pg/`, `drizzle/mysql/`
- Deploy script detects dialect and runs appropriate migrations

### Phase 6: Connection Pooling & Async

- SQLite: synchronous (better-sqlite3) — no change needed
- PostgreSQL: async with connection pool (`pg.Pool` or `postgres.js`)
- MariaDB: async with `mysql2/promise`
- All Drizzle queries return promises regardless — minimal app code changes

## Environment Configuration

```env
# Database dialect (default: sqlite)
DB_DIALECT=sqlite|postgres|mysql

# SQLite (default)
DATABASE_PATH=./data/judge.db

# PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/judgekit

# MariaDB/MySQL
DATABASE_URL=mysql://user:pass@host:3306/judgekit
```

## Files to Modify (Complete List)

### Core DB layer (new/rewrite)
- `src/lib/db/index.ts` — factory pattern
- `src/lib/db/dialect.ts` — new
- `src/lib/db/connection.ts` — new
- `src/lib/db/sql-helpers.ts` — new (dialect-aware SQL functions)
- `src/lib/db/schema.ts` — refactor or generate per dialect
- `src/lib/db/migrate.ts` — support multiple migrators
- `drizzle.config.ts` — conditional dialect

### Raw SQL files (11 files)
- `src/app/api/v1/judge/claim/route.ts`
- `src/lib/assignments/leaderboard.ts`
- `src/lib/assignments/contests.ts`
- `src/lib/assignments/contest-scoring.ts`
- `src/lib/assignments/submissions.ts`
- `src/lib/assignments/exam-sessions.ts`
- `src/lib/assignments/code-similarity.ts`
- `src/lib/assignments/contest-analytics.ts`
- `src/lib/security/rate-limit.ts`
- `src/lib/assignments/management.ts`
- `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx`

### Scripts
- `scripts/sync-language-configs.ts`
- `scripts/seed.ts`
- `deploy-docker.sh` — support non-SQLite DB URLs

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Behavioral differences between dialects | Comprehensive test suite per dialect |
| Performance regression (sync → async) | Benchmark critical paths |
| Transaction semantics differ | Dialect-aware transaction helpers |
| MariaDB lacks UPDATE...RETURNING | Use SELECT FOR UPDATE pattern |
| Auth.js adapter compatibility | `@auth/drizzle-adapter` already supports pg/mysql |

## Estimated Effort

- Phase 1-2 (DB layer + schema): ~2 days
- Phase 3-4 (SQL migration): ~3 days
- Phase 5-6 (migrations + pooling): ~1 day
- Testing across all dialects: ~2 days
- **Total: ~8 days**

## Success Criteria

- `DB_DIALECT=sqlite` works identically to current behavior (default, zero-config)
- `DB_DIALECT=postgres` passes full E2E suite against a PostgreSQL 17 instance
- `DB_DIALECT=mysql` passes full E2E suite against a MariaDB 11 instance
- No performance regression on SQLite path
