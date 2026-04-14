ALTER TABLE "assignments"
  ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'private' NOT NULL;
