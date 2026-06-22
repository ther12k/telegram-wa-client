# Real Telegram Integration Plan (mtcute)

## Status

- Plan written: 2026-06-21
- Pi review: 2026-06-21 (review-only, 1 round)
- Pi verdict: **Required fixes for plan: None**. Verdicts on 6 open questions + 5 extra concerns incorporated below.

## Story 1 — Add mtcute deps + env scaffolding (DONE)

- Branch: `real-telegram/story-1-deps`
- Commits: `b155da2` (deps), `23132e4` (source bug fix: NODE_ENV gate + absolute webDist path)
- Pi review verdict: Required fixes for the plan: **None**. Next review should include the real diff.

## Stories 2-7 (open)

### Story 2: MtcuteTelegramAdapter (next)

Per Pi:

- Library: **mtcute** (confirmed). Pin versions.
- Bun compatibility: treat as risk not blocker. Avoid Node-only assumptions in adapter. Keep mtcute behind interfaces.
- Session storage: **`@mtcute/sqlite`** (confirmed, already installed).
- Auth flow: implement the 6 TelegramAdapter methods (getAuthState, sendCode, submitCode, submitPassword, startQrLogin, logout).
- Logout must: destroy mtcute session storage + stop/recreate the client cleanly.
- Sanitize errors before logging: strip phone numbers, codes, session paths, api_hash.

### Story 3: Replace FakeTelegramAdapter in app.ts (safe fallback)

Per Pi:

- Health endpoint: keep `telegram: "not-configured"` and `demoMode: true` flags.
- Add startup `console.warn('RUNNING WITH FAKE TELEGRAM ADAPTER')` when fallback active.
- **Ideally fail closed in production** unless `DEMO_MODE=true` (i.e. if prod + creds missing → exit non-zero).
- Singleton providers from app.ts may need explicit startup/shutdown handling.

### Story 4: MtcuteDialogProvider

Per Pi:

- Calls `client.getDialogs()`. Maps Telegram dialog types → existing Dialog schema.
- updateDialog / deleteDialog via Telegram's pin/archive/mute/delete APIs.
- Pagination via offset/limit.

### Story 5: MtcuteMessageProvider

Per Pi:

- getHistory, sendMessage (text + media + replyTo), searchMessages (iterMessages({search})), markRead.
- Per Pi: avoid full phone numbers, codes, session paths in any logs.

### Story 6: Persist session via Docker volume

Per Pi:

- Mount `./telewa-session:/app/sessions` (or similar). Volume permissions = private.
- Update `.gitignore`: `telewa-session/`, `sessions/`, `*.session`, `*.sqlite`, `*.db`.
- Verify: container restart preserves auth.

### Story 7: Wire mtcute UpdateHandler to RealtimeRouter

Per Pi:

- **Keep existing SSE pattern** (don't move to WebSocket).
- Map `NewMessage`, `MessageEdited`, `MessageDeleted` → existing `RealtimeEvent` union.
- Frontend already consumes RealtimeEvent (no UI changes).

## Pi's extra concerns (all open for Story 2-7)

1. **HTTP-layer protection required** before production real-Telegram use. Single-user Telegram session alone is not enough on a public URL — anyone reaching the app can operate the logged-in account. Minimal: server-side app password OR reverse-proxy auth. (This is BIG — needs design.)
2. **Per-IP/per-phone rate limits** on `/api/auth/*` (current rate limit is generic 200/min). Real Telegram code/password endpoints need stricter throttling to reduce flood-wait/account-ban risk.
3. **No secrets in logs.** Sanitize mtcute errors before returning/logging — strip phone, codes, session paths, api_hash.
4. **Session directory permissions + .gitignore** for `telewa-session/`, `sessions/`, `*.session`, `*.sqlite`, `*.db`.
5. **Logout must destroy mtcute session storage + stop/recreate client** cleanly.
6. **Singleton providers from app.ts may need explicit lifecycle** (startup/shutdown) for mtcute — avoid duplicate update handlers in tests/hot-reload.

## Required credentials (from user)

Before Story 2 can be integration-tested, the user must provide:

- `TELEGRAM_API_ID` — a number (e.g. `12345678`)
- `TELEGRAM_API_HASH` — 32-char hex (e.g. `a1b2c3d4e5f67890abcdef1234567890`)

Get from **https://my.telegram.org** → log in with your Telegram account → "API development tools" → "Create new application".

Also a real phone number reachable for SMS (Telegram sends the code there on first login). The user has not provided these yet.
