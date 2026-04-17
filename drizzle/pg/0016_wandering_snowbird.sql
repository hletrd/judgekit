CREATE TABLE "community_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"user_id" text NOT NULL,
	"vote_type" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contest_announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contest_clarifications" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"problem_id" text,
	"user_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"answer_type" text,
	"answered_by" text,
	"answered_at" timestamp with time zone,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "judge_workers" ADD COLUMN "secret_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "problem_sets" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recruiting_invitations" ADD COLUMN "token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "share_accepted_solutions" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "accepted_solutions_anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "community_votes" ADD CONSTRAINT "community_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_announcements" ADD CONSTRAINT "contest_announcements_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_announcements" ADD CONSTRAINT "contest_announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_clarifications" ADD CONSTRAINT "contest_clarifications_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_clarifications" ADD CONSTRAINT "contest_clarifications_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_clarifications" ADD CONSTRAINT "contest_clarifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_clarifications" ADD CONSTRAINT "contest_clarifications_answered_by_users_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cv_target_idx" ON "community_votes" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cv_target_user_idx" ON "community_votes" USING btree ("target_type","target_id","user_id");--> statement-breakpoint
CREATE INDEX "contest_announcements_assignment_idx" ON "contest_announcements" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "contest_announcements_pinned_idx" ON "contest_announcements" USING btree ("assignment_id","is_pinned","created_at");--> statement-breakpoint
CREATE INDEX "contest_clarifications_assignment_idx" ON "contest_clarifications" USING btree ("assignment_id","created_at");--> statement-breakpoint
CREATE INDEX "contest_clarifications_problem_idx" ON "contest_clarifications" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "contest_clarifications_user_idx" ON "contest_clarifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ri_token_hash_idx" ON "recruiting_invitations" USING btree ("token_hash");