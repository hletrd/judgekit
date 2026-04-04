# Project Rules

## Deployment: Preserve Production config.ts

When deploying, **always use the current `src/lib/auth/config.ts`** as-is. Do NOT revert, overwrite, or regenerate this file from a previous version. The current version contains production-specific logging that must be preserved during deployment.
