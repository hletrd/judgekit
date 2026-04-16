ALTER TABLE "submissions" ADD COLUMN "failed_test_case_index" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "runtime_error_type" text;