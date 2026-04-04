CREATE INDEX "groups_instructor_id_idx" ON "groups" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "problems_created_at_idx" ON "problems" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "submissions_submitted_at_idx" ON "submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");