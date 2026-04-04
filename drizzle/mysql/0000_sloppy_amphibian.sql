CREATE TABLE `accounts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(255) NOT NULL,
	`provider` varchar(255) NOT NULL,
	`provider_account_id` varchar(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` int,
	`token_type` varchar(255),
	`scope` varchar(255),
	`id_token` text,
	`session_state` varchar(255),
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `anti_cheat_events` (
	`id` varchar(36) NOT NULL,
	`assignment_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`event_type` varchar(255) NOT NULL,
	`details` text,
	`ip_address` varchar(255),
	`user_agent` text,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `anti_cheat_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignment_problems` (
	`id` varchar(36) NOT NULL,
	`assignment_id` varchar(36) NOT NULL,
	`problem_id` varchar(36) NOT NULL,
	`points` int DEFAULT 100,
	`sort_order` int DEFAULT 0,
	CONSTRAINT `assignment_problems_id` PRIMARY KEY(`id`),
	CONSTRAINT `ap_assignment_problem_idx` UNIQUE(`assignment_id`,`problem_id`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` varchar(36) NOT NULL,
	`group_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`starts_at` timestamp,
	`deadline` timestamp,
	`late_deadline` timestamp,
	`late_penalty` double DEFAULT 0,
	`exam_mode` varchar(255) NOT NULL DEFAULT 'none',
	`exam_duration_minutes` int,
	`scoring_model` varchar(255) NOT NULL DEFAULT 'ioi',
	`access_code` varchar(255),
	`freeze_leaderboard_at` timestamp,
	`enable_anti_cheat` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`actor_role` varchar(255),
	`action` varchar(255) NOT NULL,
	`resource_type` varchar(255) NOT NULL,
	`resource_id` varchar(255),
	`resource_label` varchar(255),
	`summary` text NOT NULL,
	`details` text,
	`ip_address` varchar(255),
	`user_agent` text,
	`request_method` varchar(255),
	`request_path` varchar(255),
	`created_at` timestamp NOT NULL,
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`session_id` varchar(255) NOT NULL,
	`role` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`problem_id` varchar(36),
	`model` varchar(255),
	`provider` varchar(255),
	`created_at` timestamp NOT NULL,
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contest_access_tokens` (
	`id` varchar(36) NOT NULL,
	`assignment_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`redeemed_at` timestamp NOT NULL,
	`ip_address` varchar(255),
	CONSTRAINT `contest_access_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `cat_assignment_user_idx` UNIQUE(`assignment_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`group_id` varchar(36) NOT NULL,
	`enrolled_at` timestamp NOT NULL,
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollments_user_group_idx` UNIQUE(`user_id`,`group_id`)
);
--> statement-breakpoint
CREATE TABLE `exam_sessions` (
	`id` varchar(36) NOT NULL,
	`assignment_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`started_at` timestamp NOT NULL,
	`personal_deadline` timestamp NOT NULL,
	`ip_address` varchar(255),
	CONSTRAINT `exam_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `exam_sessions_assignment_user_idx` UNIQUE(`assignment_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` varchar(36) NOT NULL,
	`original_name` varchar(500) NOT NULL,
	`stored_name` varchar(255) NOT NULL,
	`mime_type` varchar(255) NOT NULL,
	`size_bytes` int NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT 'attachment',
	`width` int,
	`height` int,
	`uploaded_by` varchar(36),
	`created_at` timestamp NOT NULL,
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`instructor_id` varchar(36),
	`is_archived` boolean DEFAULT false,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `judge_workers` (
	`id` varchar(36) NOT NULL,
	`hostname` varchar(255) NOT NULL,
	`alias` varchar(255),
	`ip_address` varchar(255),
	`secret_token` text,
	`concurrency` int NOT NULL DEFAULT 1,
	`active_tasks` int NOT NULL DEFAULT 0,
	`version` varchar(255),
	`labels` json DEFAULT ('[]'),
	`status` varchar(255) NOT NULL DEFAULT 'online',
	`registered_at` timestamp NOT NULL,
	`last_heartbeat_at` timestamp NOT NULL,
	`deregistered_at` timestamp,
	CONSTRAINT `judge_workers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `language_configs` (
	`id` varchar(36) NOT NULL,
	`language` varchar(255) NOT NULL,
	`display_name` varchar(255) NOT NULL,
	`standard` varchar(255),
	`extension` varchar(255) NOT NULL,
	`docker_image` varchar(255) NOT NULL,
	`compiler` varchar(255),
	`compile_command` text,
	`run_command` text NOT NULL,
	`dockerfile` text,
	`is_enabled` boolean DEFAULT true,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `language_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `language_configs_language_unique` UNIQUE(`language`)
);
--> statement-breakpoint
CREATE TABLE `login_events` (
	`id` varchar(36) NOT NULL,
	`outcome` varchar(255) NOT NULL,
	`attempted_identifier` varchar(255),
	`user_id` varchar(36),
	`ip_address` varchar(255),
	`user_agent` text,
	`request_method` varchar(255),
	`request_path` varchar(255),
	`created_at` timestamp NOT NULL,
	CONSTRAINT `login_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plugins` (
	`id` varchar(255) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`config` json,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `plugins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `problem_group_access` (
	`id` varchar(36) NOT NULL,
	`problem_id` varchar(36) NOT NULL,
	`group_id` varchar(36) NOT NULL,
	CONSTRAINT `problem_group_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `pga_problem_group_idx` UNIQUE(`problem_id`,`group_id`)
);
--> statement-breakpoint
CREATE TABLE `problem_set_group_access` (
	`id` varchar(36) NOT NULL,
	`problem_set_id` varchar(36) NOT NULL,
	`group_id` varchar(36) NOT NULL,
	`assigned_at` timestamp NOT NULL,
	CONSTRAINT `problem_set_group_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `psga_problem_set_group_idx` UNIQUE(`problem_set_id`,`group_id`)
);
--> statement-breakpoint
CREATE TABLE `problem_set_problems` (
	`id` varchar(36) NOT NULL,
	`problem_set_id` varchar(36) NOT NULL,
	`problem_id` varchar(36) NOT NULL,
	`sort_order` int DEFAULT 0,
	CONSTRAINT `problem_set_problems_id` PRIMARY KEY(`id`),
	CONSTRAINT `psp_problem_set_problem_idx` UNIQUE(`problem_set_id`,`problem_id`)
);
--> statement-breakpoint
CREATE TABLE `problem_sets` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `problem_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `problem_tags` (
	`id` varchar(36) NOT NULL,
	`problem_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	CONSTRAINT `problem_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `pt_problem_tag_idx` UNIQUE(`problem_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `problems` (
	`id` varchar(36) NOT NULL,
	`sequence_number` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`time_limit_ms` int DEFAULT 2000,
	`memory_limit_mb` int DEFAULT 256,
	`visibility` varchar(255) DEFAULT 'private',
	`show_compile_output` boolean NOT NULL DEFAULT true,
	`show_detailed_results` boolean NOT NULL DEFAULT true,
	`show_runtime_errors` boolean NOT NULL DEFAULT true,
	`allow_ai_assistant` boolean NOT NULL DEFAULT true,
	`comparison_mode` varchar(255) NOT NULL DEFAULT 'exact',
	`float_absolute_error` double,
	`float_relative_error` double,
	`difficulty` double,
	`author_id` varchar(36),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `problems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`window_started_at` bigint NOT NULL,
	`blocked_until` bigint,
	`consecutive_blocks` int DEFAULT 0,
	`last_attempt` bigint NOT NULL,
	`created_at` bigint,
	CONSTRAINT `rate_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_limits_key_idx` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`display_name` varchar(255) NOT NULL,
	`description` text,
	`is_builtin` boolean NOT NULL DEFAULT false,
	`level` int NOT NULL DEFAULT 0,
	`capabilities` json NOT NULL DEFAULT ('[]'),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`),
	CONSTRAINT `roles_name_idx` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `score_overrides` (
	`id` varchar(36) NOT NULL,
	`assignment_id` varchar(36) NOT NULL,
	`problem_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`override_score` double NOT NULL,
	`reason` text,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL,
	CONSTRAINT `score_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `score_overrides_assignment_problem_user_idx` UNIQUE(`assignment_id`,`problem_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` varchar(255) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires` timestamp NOT NULL,
	CONSTRAINT `sessions_session_token` PRIMARY KEY(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `submission_comments` (
	`id` varchar(36) NOT NULL,
	`submission_id` varchar(36) NOT NULL,
	`author_id` varchar(36),
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `submission_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submission_results` (
	`id` varchar(36) NOT NULL,
	`submission_id` varchar(36) NOT NULL,
	`test_case_id` varchar(36) NOT NULL,
	`status` varchar(255) NOT NULL,
	`actual_output` text,
	`execution_time_ms` int,
	`memory_used_kb` int,
	CONSTRAINT `submission_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`problem_id` varchar(36) NOT NULL,
	`assignment_id` varchar(36),
	`language` varchar(255) NOT NULL,
	`source_code` text NOT NULL,
	`status` varchar(255) DEFAULT 'pending',
	`judge_claim_token` varchar(255),
	`judge_claimed_at` timestamp,
	`judge_worker_id` varchar(36),
	`compile_output` text,
	`execution_time_ms` int,
	`memory_used_kb` int,
	`score` double,
	`judged_at` timestamp,
	`ip_address` varchar(255),
	`submitted_at` timestamp NOT NULL,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` varchar(36) NOT NULL,
	`site_title` varchar(255),
	`site_description` text,
	`time_zone` varchar(255),
	`ai_assistant_enabled` boolean NOT NULL DEFAULT true,
	`login_rate_limit_max_attempts` int,
	`login_rate_limit_window_ms` int,
	`login_rate_limit_block_ms` int,
	`api_rate_limit_max` int,
	`api_rate_limit_window_ms` int,
	`submission_rate_limit_max_per_minute` int,
	`submission_max_pending` int,
	`submission_global_queue_limit` int,
	`default_time_limit_ms` int,
	`default_memory_limit_mb` int,
	`max_source_code_size_bytes` int,
	`stale_claim_timeout_ms` int,
	`session_max_age_seconds` int,
	`min_password_length` int,
	`default_page_size` int,
	`max_sse_connections_per_user` int,
	`sse_poll_interval_ms` int,
	`sse_timeout_ms` int,
	`upload_max_image_size_bytes` int,
	`upload_max_file_size_bytes` int,
	`upload_max_image_dimension` int,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(255),
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL,
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_idx` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `test_cases` (
	`id` varchar(36) NOT NULL,
	`problem_id` varchar(36) NOT NULL,
	`input` text NOT NULL,
	`expected_output` text NOT NULL,
	`is_visible` boolean DEFAULT false,
	`sort_order` int DEFAULT 0,
	CONSTRAINT `test_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`username` varchar(255) NOT NULL,
	`email` varchar(255),
	`name` text NOT NULL,
	`class_name` varchar(255),
	`password_hash` text,
	`role` varchar(255) NOT NULL DEFAULT 'student',
	`is_active` boolean DEFAULT true,
	`must_change_password` boolean DEFAULT false,
	`token_invalidated_at` timestamp,
	`email_verified` timestamp,
	`image` text,
	`preferred_language` varchar(255),
	`preferred_theme` varchar(255),
	`editor_theme` varchar(255),
	`editor_font_size` varchar(255),
	`editor_font_family` varchar(255),
	`lecture_mode` varchar(255),
	`lecture_font_scale` varchar(255),
	`lecture_color_scheme` varchar(255),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `anti_cheat_events` ADD CONSTRAINT `anti_cheat_events_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `anti_cheat_events` ADD CONSTRAINT `anti_cheat_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_problems` ADD CONSTRAINT `assignment_problems_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_problems` ADD CONSTRAINT `assignment_problems_problem_id_problems_id_fk` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contest_access_tokens` ADD CONSTRAINT `contest_access_tokens_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contest_access_tokens` ADD CONSTRAINT `contest_access_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_sessions` ADD CONSTRAINT `exam_sessions_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_sessions` ADD CONSTRAINT `exam_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `groups` ADD CONSTRAINT `groups_instructor_id_users_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `login_events` ADD CONSTRAINT `login_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problem_group_access` ADD CONSTRAINT `problem_group_access_problem_id_problems_id_fk` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problem_group_access` ADD CONSTRAINT `problem_group_access_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problem_set_group_access` ADD CONSTRAINT `problem_set_group_access_problem_set_id_problem_sets_id_fk` FOREIGN KEY (`problem_set_id`) REFERENCES `problem_sets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problem_set_group_access` ADD CONSTRAINT `problem_set_group_access_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problem_set_problems` ADD CONSTRAINT `problem_set_problems_problem_set_id_problem_sets_id_fk` FOREIGN KEY (`problem_set_id`) REFERENCES `problem_sets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problem_set_problems` ADD CONSTRAINT `problem_set_problems_problem_id_problems_id_fk` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problem_sets` ADD CONSTRAINT `problem_sets_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problem_tags` ADD CONSTRAINT `problem_tags_problem_id_problems_id_fk` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problem_tags` ADD CONSTRAINT `problem_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problems` ADD CONSTRAINT `problems_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `score_overrides` ADD CONSTRAINT `score_overrides_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `score_overrides` ADD CONSTRAINT `score_overrides_problem_id_problems_id_fk` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `score_overrides` ADD CONSTRAINT `score_overrides_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `score_overrides` ADD CONSTRAINT `score_overrides_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission_comments` ADD CONSTRAINT `submission_comments_submission_id_submissions_id_fk` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission_comments` ADD CONSTRAINT `submission_comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission_results` ADD CONSTRAINT `submission_results_submission_id_submissions_id_fk` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission_results` ADD CONSTRAINT `submission_results_test_case_id_test_cases_id_fk` FOREIGN KEY (`test_case_id`) REFERENCES `test_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_problem_id_problems_id_fk` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_problem_id_problems_id_fk` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ace_assignment_user_idx` ON `anti_cheat_events` (`assignment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `ace_assignment_type_idx` ON `anti_cheat_events` (`assignment_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `ace_assignment_created_idx` ON `anti_cheat_events` (`assignment_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ap_assignment_idx` ON `assignment_problems` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `ap_problem_idx` ON `assignment_problems` (`problem_id`);--> statement-breakpoint
CREATE INDEX `assignments_group_idx` ON `assignments` (`group_id`);--> statement-breakpoint
CREATE INDEX `assignments_access_code_idx` ON `assignments` (`access_code`);--> statement-breakpoint
CREATE INDEX `audit_events_actor_idx` ON `audit_events` (`actor_id`);--> statement-breakpoint
CREATE INDEX `audit_events_action_idx` ON `audit_events` (`action`);--> statement-breakpoint
CREATE INDEX `audit_events_resource_type_idx` ON `audit_events` (`resource_type`);--> statement-breakpoint
CREATE INDEX `audit_events_created_at_idx` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `enrollments_user_idx` ON `enrollments` (`user_id`);--> statement-breakpoint
CREATE INDEX `enrollments_group_idx` ON `enrollments` (`group_id`);--> statement-breakpoint
CREATE INDEX `exam_sessions_assignment_idx` ON `exam_sessions` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `exam_sessions_user_idx` ON `exam_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `files_uploaded_by_idx` ON `files` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `files_category_idx` ON `files` (`category`);--> statement-breakpoint
CREATE INDEX `files_created_at_idx` ON `files` (`created_at`);--> statement-breakpoint
CREATE INDEX `judge_workers_status_idx` ON `judge_workers` (`status`);--> statement-breakpoint
CREATE INDEX `judge_workers_last_heartbeat_idx` ON `judge_workers` (`last_heartbeat_at`);--> statement-breakpoint
CREATE INDEX `login_events_outcome_idx` ON `login_events` (`outcome`);--> statement-breakpoint
CREATE INDEX `login_events_user_idx` ON `login_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `login_events_created_at_idx` ON `login_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `pga_problem_idx` ON `problem_group_access` (`problem_id`);--> statement-breakpoint
CREATE INDEX `pga_group_idx` ON `problem_group_access` (`group_id`);--> statement-breakpoint
CREATE INDEX `psga_problem_set_idx` ON `problem_set_group_access` (`problem_set_id`);--> statement-breakpoint
CREATE INDEX `psga_group_idx` ON `problem_set_group_access` (`group_id`);--> statement-breakpoint
CREATE INDEX `psp_problem_set_idx` ON `problem_set_problems` (`problem_set_id`);--> statement-breakpoint
CREATE INDEX `psp_problem_idx` ON `problem_set_problems` (`problem_id`);--> statement-breakpoint
CREATE INDEX `pt_problem_idx` ON `problem_tags` (`problem_id`);--> statement-breakpoint
CREATE INDEX `pt_tag_idx` ON `problem_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `roles_level_idx` ON `roles` (`level`);--> statement-breakpoint
CREATE INDEX `score_overrides_assignment_idx` ON `score_overrides` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `sc_submission_idx` ON `submission_comments` (`submission_id`);--> statement-breakpoint
CREATE INDEX `sc_author_idx` ON `submission_comments` (`author_id`);--> statement-breakpoint
CREATE INDEX `sr_submission_idx` ON `submission_results` (`submission_id`);--> statement-breakpoint
CREATE INDEX `sr_test_case_idx` ON `submission_results` (`test_case_id`);--> statement-breakpoint
CREATE INDEX `submissions_user_problem_idx` ON `submissions` (`user_id`,`problem_id`);--> statement-breakpoint
CREATE INDEX `submissions_assignment_user_problem_idx` ON `submissions` (`assignment_id`,`user_id`,`problem_id`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);--> statement-breakpoint
CREATE INDEX `submissions_user_idx` ON `submissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `submissions_problem_idx` ON `submissions` (`problem_id`);--> statement-breakpoint
CREATE INDEX `submissions_assignment_idx` ON `submissions` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `submissions_judge_worker_idx` ON `submissions` (`judge_worker_id`);--> statement-breakpoint
CREATE INDEX `test_cases_problem_idx` ON `test_cases` (`problem_id`);