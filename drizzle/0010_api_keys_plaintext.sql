ALTER TABLE `api_keys` ADD `key_plain` text NOT NULL DEFAULT '';
--> statement-breakpoint
-- Existing hashed keys cannot be recovered. They must be regenerated.
-- Remove the old hash column after migration.
