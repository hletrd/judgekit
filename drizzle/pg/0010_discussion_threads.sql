CREATE TABLE IF NOT EXISTS "discussion_threads" (
  "id" text PRIMARY KEY NOT NULL,
  "scope_type" text NOT NULL,
  "problem_id" text,
  "author_id" text,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "locked_at" timestamp with time zone,
  "pinned_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discussion_posts" (
  "id" text PRIMARY KEY NOT NULL,
  "thread_id" text NOT NULL,
  "author_id" text,
  "content" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discussion_threads_problem_id_problems_id_fk'
  ) THEN
    ALTER TABLE "discussion_threads"
      ADD CONSTRAINT "discussion_threads_problem_id_problems_id_fk"
      FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discussion_threads_author_id_users_id_fk'
  ) THEN
    ALTER TABLE "discussion_threads"
      ADD CONSTRAINT "discussion_threads_author_id_users_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discussion_posts_thread_id_discussion_threads_id_fk'
  ) THEN
    ALTER TABLE "discussion_posts"
      ADD CONSTRAINT "discussion_posts_thread_id_discussion_threads_id_fk"
      FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discussion_posts_author_id_users_id_fk'
  ) THEN
    ALTER TABLE "discussion_posts"
      ADD CONSTRAINT "discussion_posts_author_id_users_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dt_scope_idx" ON "discussion_threads" USING btree ("scope_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dt_problem_idx" ON "discussion_threads" USING btree ("problem_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dt_updated_at_idx" ON "discussion_threads" USING btree ("updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dp_thread_idx" ON "discussion_posts" USING btree ("thread_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dp_author_idx" ON "discussion_posts" USING btree ("author_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dp_created_at_idx" ON "discussion_posts" USING btree ("created_at");
