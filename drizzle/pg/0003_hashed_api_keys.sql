CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "key_hash" text;--> statement-breakpoint
UPDATE "api_keys"
SET "key_hash" = encode(digest("key_plain", 'sha256'), 'hex')
WHERE "key_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "key_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "key_plain";--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_unique" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys" USING btree ("key_prefix");
