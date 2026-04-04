CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key_plain` text NOT NULL,
	`key_prefix` text NOT NULL,
	`created_by_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`role` text NOT NULL DEFAULT 'admin',
	`last_used_at` integer,
	`expires_at` integer,
	`is_active` integer NOT NULL DEFAULT 1,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `api_keys_prefix_idx` ON `api_keys` (`key_prefix`);
--> statement-breakpoint
CREATE INDEX `api_keys_created_by_idx` ON `api_keys` (`created_by_id`);
