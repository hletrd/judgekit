CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "anti_cheat_events" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_problems" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"problem_id" text NOT NULL,
	"points" integer DEFAULT 100,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone,
	"deadline" timestamp with time zone,
	"late_deadline" timestamp with time zone,
	"late_penalty" double precision DEFAULT 0,
	"exam_mode" text DEFAULT 'none' NOT NULL,
	"exam_duration_minutes" integer,
	"scoring_model" text DEFAULT 'ioi' NOT NULL,
	"access_code" text,
	"freeze_leaderboard_at" timestamp with time zone,
	"enable_anti_cheat" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_role" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"resource_label" text,
	"summary" text NOT NULL,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"request_method" text,
	"request_path" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"problem_id" text,
	"model" text,
	"provider" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contest_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"redeemed_at" timestamp with time zone NOT NULL,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"group_id" text NOT NULL,
	"enrolled_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"personal_deadline" timestamp with time zone NOT NULL,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"original_name" text NOT NULL,
	"stored_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"category" text DEFAULT 'attachment' NOT NULL,
	"width" integer,
	"height" integer,
	"uploaded_by" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"instructor_id" text,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judge_workers" (
	"id" text PRIMARY KEY NOT NULL,
	"hostname" text NOT NULL,
	"alias" text,
	"ip_address" text,
	"secret_token" text,
	"concurrency" integer DEFAULT 1 NOT NULL,
	"active_tasks" integer DEFAULT 0 NOT NULL,
	"version" text,
	"labels" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'online' NOT NULL,
	"registered_at" timestamp with time zone NOT NULL,
	"last_heartbeat_at" timestamp with time zone NOT NULL,
	"deregistered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "language_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"language" text NOT NULL,
	"display_name" text NOT NULL,
	"standard" text,
	"extension" text NOT NULL,
	"docker_image" text NOT NULL,
	"compiler" text,
	"compile_command" text,
	"run_command" text NOT NULL,
	"dockerfile" text,
	"is_enabled" boolean DEFAULT true,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "language_configs_language_unique" UNIQUE("language")
);
--> statement-breakpoint
CREATE TABLE "login_events" (
	"id" text PRIMARY KEY NOT NULL,
	"outcome" text NOT NULL,
	"attempted_identifier" text,
	"user_id" text,
	"ip_address" text,
	"user_agent" text,
	"request_method" text,
	"request_path" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugins" (
	"id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_group_access" (
	"id" text PRIMARY KEY NOT NULL,
	"problem_id" text NOT NULL,
	"group_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_set_group_access" (
	"id" text PRIMARY KEY NOT NULL,
	"problem_set_id" text NOT NULL,
	"group_id" text NOT NULL,
	"assigned_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_set_problems" (
	"id" text PRIMARY KEY NOT NULL,
	"problem_set_id" text NOT NULL,
	"problem_id" text NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "problem_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"problem_id" text NOT NULL,
	"tag_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" text PRIMARY KEY NOT NULL,
	"sequence_number" integer,
	"title" text NOT NULL,
	"description" text,
	"time_limit_ms" integer DEFAULT 2000,
	"memory_limit_mb" integer DEFAULT 256,
	"visibility" text DEFAULT 'private',
	"show_compile_output" boolean DEFAULT true NOT NULL,
	"show_detailed_results" boolean DEFAULT true NOT NULL,
	"show_runtime_errors" boolean DEFAULT true NOT NULL,
	"allow_ai_assistant" boolean DEFAULT true NOT NULL,
	"comparison_mode" text DEFAULT 'exact' NOT NULL,
	"float_absolute_error" double precision,
	"float_relative_error" double precision,
	"difficulty" double precision,
	"author_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"window_started_at" bigint NOT NULL,
	"blocked_until" bigint,
	"consecutive_blocks" integer DEFAULT 0,
	"last_attempt" bigint NOT NULL,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_builtin" boolean DEFAULT false NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "score_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"problem_id" text NOT NULL,
	"user_id" text NOT NULL,
	"override_score" double precision NOT NULL,
	"reason" text,
	"created_by" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"author_id" text,
	"content" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_results" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"test_case_id" text NOT NULL,
	"status" text NOT NULL,
	"actual_output" text,
	"execution_time_ms" integer,
	"memory_used_kb" integer
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"problem_id" text NOT NULL,
	"assignment_id" text,
	"language" text NOT NULL,
	"source_code" text NOT NULL,
	"status" text DEFAULT 'pending',
	"judge_claim_token" text,
	"judge_claimed_at" timestamp with time zone,
	"judge_worker_id" text,
	"compile_output" text,
	"execution_time_ms" integer,
	"memory_used_kb" integer,
	"score" double precision,
	"judged_at" timestamp with time zone,
	"ip_address" text,
	"submitted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"site_title" text,
	"site_description" text,
	"time_zone" text,
	"ai_assistant_enabled" boolean DEFAULT true NOT NULL,
	"login_rate_limit_max_attempts" integer,
	"login_rate_limit_window_ms" integer,
	"login_rate_limit_block_ms" integer,
	"api_rate_limit_max" integer,
	"api_rate_limit_window_ms" integer,
	"submission_rate_limit_max_per_minute" integer,
	"submission_max_pending" integer,
	"submission_global_queue_limit" integer,
	"default_time_limit_ms" integer,
	"default_memory_limit_mb" integer,
	"max_source_code_size_bytes" integer,
	"stale_claim_timeout_ms" integer,
	"session_max_age_seconds" integer,
	"min_password_length" integer,
	"default_page_size" integer,
	"max_sse_connections_per_user" integer,
	"sse_poll_interval_ms" integer,
	"sse_timeout_ms" integer,
	"upload_max_image_size_bytes" integer,
	"upload_max_file_size_bytes" integer,
	"upload_max_image_dimension" integer,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_by" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"problem_id" text NOT NULL,
	"input" text NOT NULL,
	"expected_output" text NOT NULL,
	"is_visible" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"name" text NOT NULL,
	"class_name" text,
	"password_hash" text,
	"role" text DEFAULT 'student' NOT NULL,
	"is_active" boolean DEFAULT true,
	"must_change_password" boolean DEFAULT false,
	"token_invalidated_at" timestamp with time zone,
	"email_verified" timestamp with time zone,
	"image" text,
	"preferred_language" text,
	"preferred_theme" text,
	"editor_theme" text,
	"editor_font_size" text,
	"editor_font_family" text,
	"lecture_mode" text,
	"lecture_font_scale" text,
	"lecture_color_scheme" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anti_cheat_events" ADD CONSTRAINT "anti_cheat_events_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anti_cheat_events" ADD CONSTRAINT "anti_cheat_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_problems" ADD CONSTRAINT "assignment_problems_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_problems" ADD CONSTRAINT "assignment_problems_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_access_tokens" ADD CONSTRAINT "contest_access_tokens_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_access_tokens" ADD CONSTRAINT "contest_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_group_access" ADD CONSTRAINT "problem_group_access_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_group_access" ADD CONSTRAINT "problem_group_access_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_set_group_access" ADD CONSTRAINT "problem_set_group_access_problem_set_id_problem_sets_id_fk" FOREIGN KEY ("problem_set_id") REFERENCES "public"."problem_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_set_group_access" ADD CONSTRAINT "problem_set_group_access_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_set_problems" ADD CONSTRAINT "problem_set_problems_problem_set_id_problem_sets_id_fk" FOREIGN KEY ("problem_set_id") REFERENCES "public"."problem_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_set_problems" ADD CONSTRAINT "problem_set_problems_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_sets" ADD CONSTRAINT "problem_sets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_tags" ADD CONSTRAINT "problem_tags_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_tags" ADD CONSTRAINT "problem_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_comments" ADD CONSTRAINT "submission_comments_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_comments" ADD CONSTRAINT "submission_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ace_assignment_user_idx" ON "anti_cheat_events" USING btree ("assignment_id","user_id");--> statement-breakpoint
CREATE INDEX "ace_assignment_type_idx" ON "anti_cheat_events" USING btree ("assignment_id","event_type");--> statement-breakpoint
CREATE INDEX "ace_assignment_created_idx" ON "anti_cheat_events" USING btree ("assignment_id","created_at");--> statement-breakpoint
CREATE INDEX "ap_assignment_idx" ON "assignment_problems" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "ap_problem_idx" ON "assignment_problems" USING btree ("problem_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ap_assignment_problem_idx" ON "assignment_problems" USING btree ("assignment_id","problem_id");--> statement-breakpoint
CREATE INDEX "assignments_group_idx" ON "assignments" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "assignments_access_code_idx" ON "assignments" USING btree ("access_code");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_events_action_idx" ON "audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_events_resource_type_idx" ON "audit_events" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cat_assignment_user_idx" ON "contest_access_tokens" USING btree ("assignment_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_user_group_idx" ON "enrollments" USING btree ("user_id","group_id");--> statement-breakpoint
CREATE INDEX "enrollments_user_idx" ON "enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "enrollments_group_idx" ON "enrollments" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_sessions_assignment_user_idx" ON "exam_sessions" USING btree ("assignment_id","user_id");--> statement-breakpoint
CREATE INDEX "exam_sessions_assignment_idx" ON "exam_sessions" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "exam_sessions_user_idx" ON "exam_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "files_uploaded_by_idx" ON "files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "files_category_idx" ON "files" USING btree ("category");--> statement-breakpoint
CREATE INDEX "files_created_at_idx" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "judge_workers_status_idx" ON "judge_workers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "judge_workers_last_heartbeat_idx" ON "judge_workers" USING btree ("last_heartbeat_at");--> statement-breakpoint
CREATE INDEX "login_events_outcome_idx" ON "login_events" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "login_events_user_idx" ON "login_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_events_created_at_idx" ON "login_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pga_problem_idx" ON "problem_group_access" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "pga_group_idx" ON "problem_group_access" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pga_problem_group_idx" ON "problem_group_access" USING btree ("problem_id","group_id");--> statement-breakpoint
CREATE INDEX "psga_problem_set_idx" ON "problem_set_group_access" USING btree ("problem_set_id");--> statement-breakpoint
CREATE INDEX "psga_group_idx" ON "problem_set_group_access" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "psga_problem_set_group_idx" ON "problem_set_group_access" USING btree ("problem_set_id","group_id");--> statement-breakpoint
CREATE INDEX "psp_problem_set_idx" ON "problem_set_problems" USING btree ("problem_set_id");--> statement-breakpoint
CREATE INDEX "psp_problem_idx" ON "problem_set_problems" USING btree ("problem_id");--> statement-breakpoint
CREATE UNIQUE INDEX "psp_problem_set_problem_idx" ON "problem_set_problems" USING btree ("problem_set_id","problem_id");--> statement-breakpoint
CREATE INDEX "pt_problem_idx" ON "problem_tags" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "pt_tag_idx" ON "problem_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pt_problem_tag_idx" ON "problem_tags" USING btree ("problem_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_key_idx" ON "rate_limits" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "roles_level_idx" ON "roles" USING btree ("level");--> statement-breakpoint
CREATE UNIQUE INDEX "score_overrides_assignment_problem_user_idx" ON "score_overrides" USING btree ("assignment_id","problem_id","user_id");--> statement-breakpoint
CREATE INDEX "score_overrides_assignment_idx" ON "score_overrides" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "sc_submission_idx" ON "submission_comments" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "sc_author_idx" ON "submission_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "sr_submission_idx" ON "submission_results" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "sr_test_case_idx" ON "submission_results" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "submissions_user_problem_idx" ON "submissions" USING btree ("user_id","problem_id");--> statement-breakpoint
CREATE INDEX "submissions_assignment_user_problem_idx" ON "submissions" USING btree ("assignment_id","user_id","problem_id");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "submissions_user_idx" ON "submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_problem_idx" ON "submissions" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "submissions_assignment_idx" ON "submissions" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "submissions_judge_worker_idx" ON "submissions" USING btree ("judge_worker_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "test_cases_problem_idx" ON "test_cases" USING btree ("problem_id");