CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key_plain" text NOT NULL,
	"key_prefix" text NOT NULL,
	"created_by_id" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "anonymous_leaderboard" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "compiler_time_limit_ms" integer;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "allowed_hosts" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;