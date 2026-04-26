-- Pre-drop safety: hash any plaintext secret_token into secret_token_hash
-- where the hash is missing. The encode(sha256(...)) call mirrors
-- src/lib/judge/auth.ts hashToken() (SHA-256 hex digest of the raw token bytes).
--
-- This DO block is a no-op if the secret_token column has already been dropped
-- (information_schema check guards against re-running on a fresh DB), and a
-- no-op when every worker already has a hash.
--
-- Without this backfill, dropping secret_token would permanently lock out any
-- judge worker whose plaintext token was never migrated to the hash column —
-- src/lib/judge/auth.ts rejects workers without secretTokenHash. Cycle 5
-- aggregate AGG5-1 / SEC5-1 documents the failure scenario.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'judge_workers' AND column_name = 'secret_token') THEN
    EXECUTE $sql$
      UPDATE judge_workers
      SET secret_token_hash = encode(sha256(secret_token::bytea), 'hex')
      WHERE secret_token_hash IS NULL AND secret_token IS NOT NULL
    $sql$;
  END IF;
END$$;
--> statement-breakpoint
ALTER TABLE "judge_workers" DROP COLUMN IF EXISTS "secret_token";
