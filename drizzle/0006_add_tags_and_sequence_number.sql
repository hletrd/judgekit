ALTER TABLE `problems` ADD `sequence_number` integer;
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_by` text REFERENCES `users`(`id`) ON DELETE SET NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_idx` ON `tags` (`name`);
--> statement-breakpoint
CREATE TABLE `problem_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`problem_id` text NOT NULL REFERENCES `problems`(`id`) ON DELETE CASCADE,
	`tag_id` text NOT NULL REFERENCES `tags`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `pt_problem_idx` ON `problem_tags` (`problem_id`);
--> statement-breakpoint
CREATE INDEX `pt_tag_idx` ON `problem_tags` (`tag_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `pt_problem_tag_idx` ON `problem_tags` (`problem_id`, `tag_id`);
