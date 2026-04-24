# RPF Cycle 11 — Tracer

**Date:** 2026-04-24
**Reviewer:** tracer
**Scope:** Causal tracing of suspicious flows, competing hypotheses

## Traced Flows

### Flow 1: Plugin Secret Save → Encrypt → Store → Decrypt

**Hypothesis 1:** The encryption bypass in `preparePluginConfigForStorage` could lead to plaintext secrets in the DB.

**Trace:**
1. Admin saves plugin config with secret key `apiKey` = `enc:v1:faketag:fakedata`
2. `preparePluginConfigForStorage` is called with `incomingConfig.apiKey = "enc:v1:faketag:fakedata"`
3. `encryptPluginSecret("enc:v1:faketag:fakedata")` is called → produces a valid `enc:v1:...` string (double-encrypted)
4. `isEncryptedPluginSecret("enc:v1:faketag:fakedata")` → `true` (original starts with `enc:v1:`)
5. `prepared[key] = "enc:v1:faketag:fakedata"` (original, NOT encrypted)
6. Value stored in DB is plaintext `enc:v1:faketag:fakedata`
7. Plugin loads → `decryptPluginSecret("enc:v1:faketag:fakedata")`
8. Splits by `:` → `["enc", "v1", "faketag", "fakedata"]`
9. Tries HKDF key → GCM auth fails (tag mismatch)
10. Tries legacy key → GCM auth fails
11. Throws "Failed to decrypt plugin secret"
12. Caught in `decryptPluginConfigForUse` → `decrypted[key] = ""`
13. Plugin receives empty string → may malfunction

**Verdict:** Hypothesis confirmed. The bypass causes a decrypt failure, not data exfiltration. Severity: LOW.

### Flow 2: SSE Auth Re-check After Deactivation

**Hypothesis:** A deactivated user could receive one more SSE event after account deactivation.

**Trace:**
1. User has active SSE connection
2. `onPollResult` callback fires
3. `now - lastAuthCheck >= AUTH_RECHECK_INTERVAL_MS` → true
4. Sets `lastAuthCheck = now`
5. Launches async IIFE: `await getApiUser(request)`
6. Meanwhile, the sync path returns (line 438: `return; // Don't process the event synchronously`)
7. IIFE: if `reAuthUser` is null → `close()` → connection terminated
8. IIFE: if `reAuthUser` is valid → process the status event

**Verdict:** The re-auth is properly awaited before processing. No data leakage. This was fixed in a prior cycle (CR9-SR1).

No other suspicious flows identified.
