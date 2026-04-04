#!/usr/bin/env bash
# Migrate data from local SQLite DB to remote PostgreSQL
# Usage: ./scripts/migrate-sqlite-to-pg.sh
set -euo pipefail

SQLITE_DB="${1:-data/judge.db}"
SQL_OUT="/tmp/judgekit-migrate.sql"

if [[ ! -f "$SQLITE_DB" ]]; then
  echo "SQLite DB not found: $SQLITE_DB" >&2
  exit 1
fi

echo "Exporting from $SQLITE_DB..."

# Helper: convert SQLite integer timestamp (seconds) to PG timestamp literal
# NULL → NULL, integer → 'YYYY-MM-DD HH:MM:SS+00'
ts_col() {
  echo "CASE WHEN $1 IS NOT NULL THEN to_timestamp($1) ELSE NULL END"
}

cat > "$SQL_OUT" <<'HEADER'
-- JudgeKit SQLite → PostgreSQL data migration
-- Auto-generated. Run inside a psql session connected to the target DB.
SET client_encoding = 'UTF8';
BEGIN;

-- Disable FK checks during import
SET session_replication_role = 'replica';

-- Clear existing data (preserve language_configs from sync)
TRUNCATE users, groups, problems, test_cases, enrollments, assignments,
         assignment_problems, submissions, submission_results, roles,
         system_settings, accounts, sessions, login_events, audit_events,
         anti_cheat_events, chat_messages, contest_access_tokens, exam_sessions,
         files, judge_workers, plugins, problem_group_access, problem_set_group_access,
         problem_set_problems, problem_sets, problem_tags, score_overrides,
         submission_comments, tags, rate_limits
         CASCADE;

HEADER

# ── Export each table with data as INSERT statements ──

# 1. users (26 rows)
echo "-- users" >> "$SQL_OUT"
sqlite3 -json "$SQLITE_DB" "SELECT * FROM users;" | node -e "
const rows = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
for (const r of rows) {
  const vals = [
    q(r.id), q(r.username), r.email ? q(r.email) : 'NULL', q(r.name),
    r.class_name ? q(r.class_name) : 'NULL',
    r.password_hash ? q(r.password_hash) : 'NULL',
    q(r.role || 'student'),
    b(r.is_active), b(r.must_change_password),
    ts(r.token_invalidated_at), ts(r.email_verified),
    r.image ? q(r.image) : 'NULL',
    r.preferred_language ? q(r.preferred_language) : 'NULL',
    r.preferred_theme ? q(r.preferred_theme) : 'NULL',
    r.editor_theme ? q(r.editor_theme) : 'NULL',
    r.editor_font_size ? q(r.editor_font_size) : 'NULL',
    r.editor_font_family ? q(r.editor_font_family) : 'NULL',
    r.lecture_mode ? q(r.lecture_mode) : 'NULL',
    r.lecture_font_scale ? q(r.lecture_font_scale) : 'NULL',
    r.lecture_color_scheme ? q(r.lecture_color_scheme) : 'NULL',
    ts(r.created_at), ts(r.updated_at)
  ];
  console.log('INSERT INTO users (id,username,email,name,class_name,password_hash,role,is_active,must_change_password,token_invalidated_at,email_verified,image,preferred_language,preferred_theme,editor_theme,editor_font_size,editor_font_family,lecture_mode,lecture_font_scale,lecture_color_scheme,created_at,updated_at) VALUES (' + vals.join(',') + ');');
}
function q(s) { if (s == null) return 'NULL'; return \"'\" + String(s).replace(/'/g, \"''\") + \"'\"; }
function b(v) { return v ? 'TRUE' : 'FALSE'; }
function ts(v) { if (v == null) return 'NULL'; return \"to_timestamp(\" + v + \")\"; }
" >> "$SQL_OUT"

# 2. roles (4 rows)
echo "-- roles" >> "$SQL_OUT"
sqlite3 -json "$SQLITE_DB" "SELECT * FROM roles;" | node -e "
const rows = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
for (const r of rows) {
  const caps = r.capabilities ? q(r.capabilities) : q('[]');
  const vals = [
    q(r.id), q(r.name), q(r.display_name), r.description ? q(r.description) : 'NULL',
    b(r.is_builtin), r.level ?? 0, caps + '::jsonb',
    ts(r.created_at), ts(r.updated_at)
  ];
  console.log('INSERT INTO roles (id,name,display_name,description,is_builtin,level,capabilities,created_at,updated_at) VALUES (' + vals.join(',') + ');');
}
function q(s) { if (s == null) return 'NULL'; return \"'\" + String(s).replace(/'/g, \"''\") + \"'\"; }
function b(v) { return v ? 'TRUE' : 'FALSE'; }
function ts(v) { if (v == null) return 'NULL'; return \"to_timestamp(\" + v + \")\"; }
" >> "$SQL_OUT"

# 3. groups (21 rows)
echo "-- groups" >> "$SQL_OUT"
sqlite3 -json "$SQLITE_DB" "SELECT * FROM groups;" | node -e "
const rows = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
for (const r of rows) {
  const vals = [
    q(r.id), q(r.name), r.description ? q(r.description) : 'NULL',
    r.instructor_id ? q(r.instructor_id) : 'NULL',
    b(r.is_archived), ts(r.created_at), ts(r.updated_at)
  ];
  console.log('INSERT INTO groups (id,name,description,instructor_id,is_archived,created_at,updated_at) VALUES (' + vals.join(',') + ');');
}
function q(s) { if (s == null) return 'NULL'; return \"'\" + String(s).replace(/'/g, \"''\") + \"'\"; }
function b(v) { return v ? 'TRUE' : 'FALSE'; }
function ts(v) { if (v == null) return 'NULL'; return \"to_timestamp(\" + v + \")\"; }
" >> "$SQL_OUT"

# 4. problems (29 rows)
echo "-- problems" >> "$SQL_OUT"
sqlite3 -json "$SQLITE_DB" "SELECT * FROM problems;" | node -e "
const rows = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
for (const r of rows) {
  const vals = [
    q(r.id), r.sequence_number ?? 'NULL', q(r.title),
    r.description ? q(r.description) : 'NULL',
    r.time_limit_ms ?? 2000, r.memory_limit_mb ?? 256,
    q(r.visibility || 'private'),
    b(r.show_compile_output ?? 1), b(r.show_detailed_results ?? 1),
    b(r.show_runtime_errors ?? 1), b(r.allow_ai_assistant ?? 1),
    q(r.comparison_mode || 'exact'),
    r.float_absolute_error ?? 'NULL', r.float_relative_error ?? 'NULL',
    r.difficulty ?? 'NULL',
    r.author_id ? q(r.author_id) : 'NULL',
    ts(r.created_at), ts(r.updated_at)
  ];
  console.log('INSERT INTO problems (id,sequence_number,title,description,time_limit_ms,memory_limit_mb,visibility,show_compile_output,show_detailed_results,show_runtime_errors,allow_ai_assistant,comparison_mode,float_absolute_error,float_relative_error,difficulty,author_id,created_at,updated_at) VALUES (' + vals.join(',') + ');');
}
function q(s) { if (s == null) return 'NULL'; return \"'\" + String(s).replace(/'/g, \"''\") + \"'\"; }
function b(v) { return (v === 1 || v === true) ? 'TRUE' : 'FALSE'; }
function ts(v) { if (v == null) return 'NULL'; return \"to_timestamp(\" + v + \")\"; }
" >> "$SQL_OUT"

# 5. test_cases (15 rows)
echo "-- test_cases" >> "$SQL_OUT"
sqlite3 -json "$SQLITE_DB" "SELECT * FROM test_cases;" | node -e "
const rows = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
for (const r of rows) {
  const vals = [
    q(r.id), q(r.problem_id), q(r.input), q(r.expected_output),
    b(r.is_visible), r.sort_order ?? 0
  ];
  console.log('INSERT INTO test_cases (id,problem_id,input,expected_output,is_visible,sort_order) VALUES (' + vals.join(',') + ');');
}
function q(s) { if (s == null) return 'NULL'; return \"'\" + String(s).replace(/'/g, \"''\") + \"'\"; }
function b(v) { return (v === 1 || v === true) ? 'TRUE' : 'FALSE'; }
" >> "$SQL_OUT"

# 6. enrollments (5 rows)
echo "-- enrollments" >> "$SQL_OUT"
sqlite3 -json "$SQLITE_DB" "SELECT * FROM enrollments;" | node -e "
const rows = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
for (const r of rows) {
  const vals = [q(r.id), q(r.user_id), q(r.group_id), ts(r.enrolled_at)];
  console.log('INSERT INTO enrollments (id,user_id,group_id,enrolled_at) VALUES (' + vals.join(',') + ');');
}
function q(s) { if (s == null) return 'NULL'; return \"'\" + String(s).replace(/'/g, \"''\") + \"'\"; }
function ts(v) { if (v == null) return 'NULL'; return \"to_timestamp(\" + v + \")\"; }
" >> "$SQL_OUT"

# 7. assignments (3 rows)
echo "-- assignments" >> "$SQL_OUT"
sqlite3 -json "$SQLITE_DB" "SELECT * FROM assignments;" | node -e "
const rows = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
for (const r of rows) {
  const vals = [
    q(r.id), q(r.group_id), q(r.title), r.description ? q(r.description) : 'NULL',
    ts(r.starts_at), ts(r.deadline), ts(r.late_deadline),
    r.late_penalty ?? 0, q(r.exam_mode || 'none'),
    r.exam_duration_minutes ?? 'NULL',
    q(r.scoring_model || 'ioi'), r.access_code ? q(r.access_code) : 'NULL',
    ts(r.freeze_leaderboard_at), b(r.enable_anti_cheat),
    ts(r.created_at), ts(r.updated_at)
  ];
  console.log('INSERT INTO assignments (id,group_id,title,description,starts_at,deadline,late_deadline,late_penalty,exam_mode,exam_duration_minutes,scoring_model,access_code,freeze_leaderboard_at,enable_anti_cheat,created_at,updated_at) VALUES (' + vals.join(',') + ');');
}
function q(s) { if (s == null) return 'NULL'; return \"'\" + String(s).replace(/'/g, \"''\") + \"'\"; }
function b(v) { return (v === 1 || v === true) ? 'TRUE' : 'FALSE'; }
function ts(v) { if (v == null) return 'NULL'; return \"to_timestamp(\" + v + \")\"; }
" >> "$SQL_OUT"

# 8. assignment_problems (1 row)
echo "-- assignment_problems" >> "$SQL_OUT"
sqlite3 -json "$SQLITE_DB" "SELECT * FROM assignment_problems;" | node -e "
const rows = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
for (const r of rows) {
  const vals = [q(r.id), q(r.assignment_id), q(r.problem_id), r.points ?? 100, r.sort_order ?? 0];
  console.log('INSERT INTO assignment_problems (id,assignment_id,problem_id,points,sort_order) VALUES (' + vals.join(',') + ');');
}
function q(s) { if (s == null) return 'NULL'; return \"'\" + String(s).replace(/'/g, \"''\") + \"'\"; }
" >> "$SQL_OUT"

# 9. submissions (1 row)
echo "-- submissions" >> "$SQL_OUT"
sqlite3 -json "$SQLITE_DB" "SELECT * FROM submissions;" | node -e "
const rows = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
for (const r of rows) {
  const vals = [
    q(r.id), q(r.user_id), q(r.problem_id),
    r.assignment_id ? q(r.assignment_id) : 'NULL',
    q(r.language), q(r.source_code), q(r.status || 'pending'),
    r.judge_claim_token ? q(r.judge_claim_token) : 'NULL',
    ts(r.judge_claimed_at), r.judge_worker_id ? q(r.judge_worker_id) : 'NULL',
    r.compile_output ? q(r.compile_output) : 'NULL',
    r.execution_time_ms ?? 'NULL', r.memory_used_kb ?? 'NULL',
    r.score ?? 'NULL', ts(r.judged_at),
    r.ip_address ? q(r.ip_address) : 'NULL', ts(r.submitted_at)
  ];
  console.log('INSERT INTO submissions (id,user_id,problem_id,assignment_id,language,source_code,status,judge_claim_token,judge_claimed_at,judge_worker_id,compile_output,execution_time_ms,memory_used_kb,score,judged_at,ip_address,submitted_at) VALUES (' + vals.join(',') + ');');
}
function q(s) { if (s == null) return 'NULL'; return \"'\" + String(s).replace(/'/g, \"''\") + \"'\"; }
function ts(v) { if (v == null) return 'NULL'; return \"to_timestamp(\" + v + \")\"; }
" >> "$SQL_OUT"

# 10. system_settings (1 row)
echo "-- system_settings" >> "$SQL_OUT"
sqlite3 -json "$SQLITE_DB" "SELECT * FROM system_settings;" | node -e "
const rows = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
for (const r of rows) {
  const vals = [
    q(r.id), r.site_title ? q(r.site_title) : 'NULL',
    r.site_description ? q(r.site_description) : 'NULL',
    r.time_zone ? q(r.time_zone) : 'NULL',
    b(r.ai_assistant_enabled ?? 1),
    r.login_rate_limit_max_attempts ?? 'NULL',
    r.login_rate_limit_window_ms ?? 'NULL',
    r.login_rate_limit_block_ms ?? 'NULL',
    r.api_rate_limit_max ?? 'NULL',
    r.api_rate_limit_window_ms ?? 'NULL',
    r.submission_rate_limit_max_per_minute ?? 'NULL',
    r.submission_max_pending ?? 'NULL',
    r.submission_global_queue_limit ?? 'NULL',
    r.default_time_limit_ms ?? 'NULL',
    r.default_memory_limit_mb ?? 'NULL',
    r.max_source_code_size_bytes ?? 'NULL',
    r.stale_claim_timeout_ms ?? 'NULL',
    r.session_max_age_seconds ?? 'NULL',
    r.min_password_length ?? 'NULL',
    r.default_page_size ?? 'NULL',
    r.max_sse_connections_per_user ?? 'NULL',
    r.sse_poll_interval_ms ?? 'NULL',
    r.sse_timeout_ms ?? 'NULL',
    ts(r.updated_at)
  ];
  console.log('INSERT INTO system_settings (id,site_title,site_description,time_zone,ai_assistant_enabled,login_rate_limit_max_attempts,login_rate_limit_window_ms,login_rate_limit_block_ms,api_rate_limit_max,api_rate_limit_window_ms,submission_rate_limit_max_per_minute,submission_max_pending,submission_global_queue_limit,default_time_limit_ms,default_memory_limit_mb,max_source_code_size_bytes,stale_claim_timeout_ms,session_max_age_seconds,min_password_length,default_page_size,max_sse_connections_per_user,sse_poll_interval_ms,sse_timeout_ms,updated_at) VALUES (' + vals.join(',') + ');');
}
function q(s) { if (s == null) return 'NULL'; return \"'\" + String(s).replace(/'/g, \"''\") + \"'\"; }
function b(v) { return (v === 1 || v === true) ? 'TRUE' : 'FALSE'; }
function ts(v) { if (v == null) return 'NULL'; return \"to_timestamp(\" + v + \")\"; }
" >> "$SQL_OUT"

cat >> "$SQL_OUT" <<'FOOTER'

-- Re-enable FK checks
SET session_replication_role = 'origin';

COMMIT;
FOOTER

echo "SQL migration written to $SQL_OUT"
echo "Tables: users(26), roles(4), groups(21), problems(29), test_cases(15), enrollments(5), assignments(3), assignment_problems(1), submissions(1), system_settings(1)"
