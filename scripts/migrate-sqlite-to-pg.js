#!/usr/bin/env node
/**
 * Migrate data from SQLite backup to PostgreSQL.
 * Usage: node scripts/migrate-sqlite-to-pg.js [path-to-sqlite.db] > migrate.sql
 */
const { execSync } = require("child_process");
const path = require("path");

const SQLITE_DB = process.argv[2] || "/tmp/judgekit-sqlite-backup.db";

function getRows(table) {
  const raw = execSync(`sqlite3 -json "${SQLITE_DB}" "SELECT * FROM \\"${table}\\";"`, {
    maxBuffer: 500 * 1024 * 1024,
    encoding: "utf8",
  });
  return JSON.parse(raw || "[]");
}

function q(s) {
  if (s == null) return "NULL";
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function b(v) {
  return v === 1 || v === true ? "TRUE" : "FALSE";
}
function ts(v) {
  if (v == null) return "NULL";
  // Handle ISO 8601 date strings (e.g. "2026-03-28T02:16:34.794Z")
  if (typeof v === "string" && /[T\-:]/.test(v)) return q(v) + "::timestamptz";
  return `to_timestamp(${v})`;
}
// ts with fallback to now() for NOT NULL timestamp columns
function tsnn(v) {
  if (v == null) return "now()";
  if (typeof v === "string" && /[T\-:]/.test(v)) return q(v) + "::timestamptz";
  return `to_timestamp(${v})`;
}
function jsonb(v) {
  if (v == null) return "NULL";
  return q(v) + "::jsonb";
}
function num(v) {
  if (v == null) return "NULL";
  return String(v);
}

function emit(table, columns, rows, mapFn) {
  if (rows.length === 0) return;
  console.log(`-- ${table} (${rows.length} rows)`);
  for (const r of rows) {
    const vals = mapFn(r);
    console.log(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${vals.join(",")});`);
  }
  console.log("");
}

// Header
console.log("-- JudgeKit SQLite → PostgreSQL full data migration");
console.log("SET client_encoding = 'UTF8';");
console.log("BEGIN;");
console.log("SET session_replication_role = 'replica';");
console.log("");
console.log(`TRUNCATE users, groups, problems, test_cases, enrollments, assignments,
  assignment_problems, submissions, submission_results, roles,
  system_settings, accounts, sessions, login_events, audit_events,
  anti_cheat_events, chat_messages, contest_access_tokens, exam_sessions,
  files, judge_workers, plugins, problem_group_access, problem_set_group_access,
  problem_set_problems, problem_sets, problem_tags, score_overrides,
  submission_comments, tags, rate_limits, api_keys CASCADE;`);
console.log("");

// 1. users
emit("users",
  ["id","username","email","name","class_name","password_hash","role","is_active","must_change_password","token_invalidated_at","email_verified","image","preferred_language","preferred_theme","editor_theme","editor_font_size","editor_font_family","lecture_mode","lecture_font_scale","lecture_color_scheme","created_at","updated_at"],
  getRows("users"),
  r => [q(r.id),q(r.username),q(r.email),q(r.name),q(r.class_name),q(r.password_hash),q(r.role||"student"),b(r.is_active),b(r.must_change_password),ts(r.token_invalidated_at),ts(r.email_verified),q(r.image),q(r.preferred_language),q(r.preferred_theme),q(r.editor_theme),q(r.editor_font_size),q(r.editor_font_family),q(r.lecture_mode),q(r.lecture_font_scale),q(r.lecture_color_scheme),tsnn(r.created_at),tsnn(r.updated_at)]
);

// 2. roles
emit("roles",
  ["id","name","display_name","description","is_builtin","level","capabilities","created_at","updated_at"],
  getRows("roles"),
  r => [q(r.id),q(r.name),q(r.display_name),q(r.description),b(r.is_builtin),num(r.level),jsonb(r.capabilities),ts(r.created_at),ts(r.updated_at)]
);

// 3. groups
emit("groups",
  ["id","name","description","instructor_id","is_archived","created_at","updated_at"],
  getRows("groups"),
  r => [q(r.id),q(r.name),q(r.description),q(r.instructor_id),b(r.is_archived),ts(r.created_at),ts(r.updated_at)]
);

// 4. tags
emit("tags",
  ["id","name","color","created_by","created_at"],
  getRows("tags"),
  r => [q(r.id),q(r.name),q(r.color),q(r.created_by),ts(r.created_at)]
);

// 5. problems
emit("problems",
  ["id","sequence_number","title","description","time_limit_ms","memory_limit_mb","visibility","show_compile_output","show_detailed_results","show_runtime_errors","allow_ai_assistant","comparison_mode","float_absolute_error","float_relative_error","difficulty","author_id","created_at","updated_at"],
  getRows("problems"),
  r => [q(r.id),num(r.sequence_number),q(r.title),q(r.description),num(r.time_limit_ms??2000),num(r.memory_limit_mb??256),q(r.visibility||"private"),b(r.show_compile_output??1),b(r.show_detailed_results??1),b(r.show_runtime_errors??1),b(r.allow_ai_assistant??1),q(r.comparison_mode||"exact"),num(r.float_absolute_error),num(r.float_relative_error),num(r.difficulty),q(r.author_id),ts(r.created_at),ts(r.updated_at)]
);

// 6. problem_tags
emit("problem_tags",
  ["id","problem_id","tag_id"],
  getRows("problem_tags"),
  r => [q(r.id),q(r.problem_id),q(r.tag_id)]
);

// 7. test_cases
emit("test_cases",
  ["id","problem_id","input","expected_output","is_visible","sort_order"],
  getRows("test_cases"),
  r => [q(r.id),q(r.problem_id),q(r.input),q(r.expected_output),b(r.is_visible),num(r.sort_order??0)]
);

// 8. enrollments
emit("enrollments",
  ["id","user_id","group_id","enrolled_at"],
  getRows("enrollments"),
  r => [q(r.id),q(r.user_id),q(r.group_id),ts(r.enrolled_at)]
);

// 9. assignments
emit("assignments",
  ["id","group_id","title","description","starts_at","deadline","late_deadline","late_penalty","exam_mode","exam_duration_minutes","scoring_model","access_code","freeze_leaderboard_at","enable_anti_cheat","created_at","updated_at"],
  getRows("assignments"),
  r => [q(r.id),q(r.group_id),q(r.title),q(r.description),ts(r.starts_at),ts(r.deadline),ts(r.late_deadline),num(r.late_penalty??0),q(r.exam_mode||"none"),num(r.exam_duration_minutes),q(r.scoring_model||"ioi"),q(r.access_code),ts(r.freeze_leaderboard_at),b(r.enable_anti_cheat),ts(r.created_at),ts(r.updated_at)]
);

// 10. assignment_problems
emit("assignment_problems",
  ["id","assignment_id","problem_id","points","sort_order"],
  getRows("assignment_problems"),
  r => [q(r.id),q(r.assignment_id),q(r.problem_id),num(r.points??100),num(r.sort_order??0)]
);

// 11. submissions
emit("submissions",
  ["id","user_id","problem_id","assignment_id","language","source_code","status","judge_claim_token","judge_claimed_at","judge_worker_id","compile_output","execution_time_ms","memory_used_kb","score","judged_at","ip_address","submitted_at"],
  getRows("submissions"),
  r => [q(r.id),q(r.user_id),q(r.problem_id),q(r.assignment_id),q(r.language),q(r.source_code),q(r.status||"pending"),q(r.judge_claim_token),ts(r.judge_claimed_at),q(r.judge_worker_id),q(r.compile_output),num(r.execution_time_ms),num(r.memory_used_kb),num(r.score),ts(r.judged_at),q(r.ip_address),ts(r.submitted_at)]
);

// 12. submission_results
emit("submission_results",
  ["id","submission_id","test_case_id","status","actual_output","execution_time_ms","memory_used_kb"],
  getRows("submission_results"),
  r => [q(r.id),q(r.submission_id),q(r.test_case_id),q(r.status),q(r.actual_output),num(r.execution_time_ms),num(r.memory_used_kb)]
);

// 13. submission_comments
emit("submission_comments",
  ["id","submission_id","author_id","content","created_at","updated_at"],
  getRows("submission_comments"),
  r => [q(r.id),q(r.submission_id),q(r.author_id),q(r.content),ts(r.created_at),ts(r.updated_at)]
);

// 14. contest_access_tokens
emit("contest_access_tokens",
  ["id","assignment_id","user_id","redeemed_at","ip_address"],
  getRows("contest_access_tokens"),
  r => [q(r.id),q(r.assignment_id),q(r.user_id),ts(r.redeemed_at),q(r.ip_address)]
);

// 15. system_settings
emit("system_settings",
  ["id","site_title","site_description","time_zone","ai_assistant_enabled","login_rate_limit_max_attempts","login_rate_limit_window_ms","login_rate_limit_block_ms","api_rate_limit_max","api_rate_limit_window_ms","submission_rate_limit_max_per_minute","submission_max_pending","submission_global_queue_limit","default_time_limit_ms","default_memory_limit_mb","max_source_code_size_bytes","stale_claim_timeout_ms","session_max_age_seconds","min_password_length","default_page_size","max_sse_connections_per_user","sse_poll_interval_ms","sse_timeout_ms","updated_at"],
  getRows("system_settings"),
  r => [q(r.id),q(r.site_title),q(r.site_description),q(r.time_zone),b(r.ai_assistant_enabled??1),num(r.login_rate_limit_max_attempts),num(r.login_rate_limit_window_ms),num(r.login_rate_limit_block_ms),num(r.api_rate_limit_max),num(r.api_rate_limit_window_ms),num(r.submission_rate_limit_max_per_minute),num(r.submission_max_pending),num(r.submission_global_queue_limit),num(r.default_time_limit_ms),num(r.default_memory_limit_mb),num(r.max_source_code_size_bytes),num(r.stale_claim_timeout_ms),num(r.session_max_age_seconds),num(r.min_password_length),num(r.default_page_size),num(r.max_sse_connections_per_user),num(r.sse_poll_interval_ms),num(r.sse_timeout_ms),ts(r.updated_at)]
);

// 16. plugins
emit("plugins",
  ["id","enabled","config","updated_at"],
  getRows("plugins"),
  r => [q(r.id),b(r.enabled),jsonb(r.config),ts(r.updated_at)]
);

// 17. chat_messages
emit("chat_messages",
  ["id","user_id","session_id","role","content","problem_id","model","provider","created_at"],
  getRows("chat_messages"),
  r => [q(r.id),q(r.user_id),q(r.session_id),q(r.role),q(r.content),q(r.problem_id),q(r.model),q(r.provider),ts(r.created_at)]
);

// 18. api_keys (key_plain in both SQLite and new PG schema)
emit("api_keys",
  ["id","name","key_plain","key_prefix","created_by_id","role","last_used_at","expires_at","is_active","created_at","updated_at"],
  getRows("api_keys"),
  r => [q(r.id),q(r.name),q(r.key_plain),q(r.key_prefix),q(r.created_by_id),q(r.role||"admin"),ts(r.last_used_at),ts(r.expires_at),b(r.is_active),ts(r.created_at),ts(r.updated_at)]
);

// 19. login_events
emit("login_events",
  ["id","outcome","attempted_identifier","user_id","ip_address","user_agent","request_method","request_path","created_at"],
  getRows("login_events"),
  r => [q(r.id),q(r.outcome),q(r.attempted_identifier),q(r.user_id),q(r.ip_address),q(r.user_agent),q(r.request_method),q(r.request_path),ts(r.created_at)]
);

// 20. audit_events (167K rows — largest table)
emit("audit_events",
  ["id","actor_id","actor_role","action","resource_type","resource_id","resource_label","summary","details","ip_address","user_agent","request_method","request_path","created_at"],
  getRows("audit_events"),
  r => [q(r.id),q(r.actor_id),q(r.actor_role),q(r.action),q(r.resource_type),q(r.resource_id),q(r.resource_label),q(r.summary),q(r.details),q(r.ip_address),q(r.user_agent),q(r.request_method),q(r.request_path),ts(r.created_at)]
);

// Footer
console.log("SET session_replication_role = 'origin';");
console.log("COMMIT;");
