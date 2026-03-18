CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`is_builtin` integer DEFAULT false NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`capabilities` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_idx` ON `roles` (`name`);--> statement-breakpoint
CREATE INDEX `roles_level_idx` ON `roles` (`level`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_score_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`problem_id` text NOT NULL,
	`user_id` text NOT NULL,
	`override_score` real NOT NULL,
	`reason` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_score_overrides`("id", "assignment_id", "problem_id", "user_id", "override_score", "reason", "created_by", "created_at") SELECT "id", "assignment_id", "problem_id", "user_id", "override_score", "reason", "created_by", "created_at" FROM `score_overrides`;--> statement-breakpoint
DROP TABLE `score_overrides`;--> statement-breakpoint
ALTER TABLE `__new_score_overrides` RENAME TO `score_overrides`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `score_overrides_assignment_problem_user_idx` ON `score_overrides` (`assignment_id`,`problem_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `score_overrides_assignment_idx` ON `score_overrides` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `ace_assignment_created_idx` ON `anti_cheat_events` (`assignment_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `assignments_access_code_idx` ON `assignments` (`access_code`);--> statement-breakpoint
CREATE INDEX `submissions_assignment_user_problem_idx` ON `submissions` (`assignment_id`,`user_id`,`problem_id`);