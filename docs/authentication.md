# Authentication

## Sign-in

- Credentials sign-in accepts either username or email; the seeded admin uses username `admin`.
- Protected-route login preserves `callbackUrl` — logging in from a deep link returns the user to the original destination (unless forced password-change overrides it).

## Architecture

- Next.js 16 route protection lives in `src/proxy.ts`, not `src/middleware.ts`.
- HTTPS deployments behind a reverse proxy must preserve the original scheme. Auth.js JWT readers rely on `src/lib/auth/secure-cookie.ts` for the correct secure cookie name.
- Protected `/api/v1/*` routes use the Auth.js session cookie (JWT-backed), not a standalone bearer token. The bearer token is reserved for `GET`/`POST /api/v1/judge/poll`.

## Remote API Smoke Test

For external scripts, log in through the credentials callback first and persist the session cookie:

```bash
export OJ_BASE_URL="https://your-domain.example"
export OJ_USERNAME="instructor"
export OJ_PASSWORD="your-password"

COOKIE_JAR="$(mktemp)"
CSRF_TOKEN="$(curl -s -c "$COOKIE_JAR" "$OJ_BASE_URL/api/auth/csrf" | python3 -c 'import json,sys; print(json.load(sys.stdin)["csrfToken"])')"

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF_TOKEN" \
  --data-urlencode "username=$OJ_USERNAME" \
  --data-urlencode "password=$OJ_PASSWORD" \
  --data-urlencode "callbackUrl=$OJ_BASE_URL/dashboard" \
  "$OJ_BASE_URL/api/auth/callback/credentials" \
  >/dev/null

curl -s -b "$COOKIE_JAR" \
  "$OJ_BASE_URL/api/v1/problems?limit=5" | python3 -m json.tool

rm -f "$COOKIE_JAR"
```
