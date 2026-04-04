CREATE TABLE `api_keys` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`key_plain` text NOT NULL,
	`key_prefix` varchar(255) NOT NULL,
	`created_by_id` varchar(36) NOT NULL,
	`role` varchar(255) NOT NULL DEFAULT 'admin',
	`last_used_at` timestamp,
	`expires_at` timestamp,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assignments` ADD `anonymous_leaderboard` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `system_settings` ADD `compiler_time_limit_ms` int;--> statement-breakpoint
ALTER TABLE `system_settings` ADD `allowed_hosts` text;--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;