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

## Shipped since this plan was written

- **Story 1 (deps + adapter + env scaffolding)** — DONE, PR #3 merged to main at `fc6ee75`. Includes 3 Pi round-1 fixes + better-sqlite3 override for Node 22 build (PR #3 round 4).
- **Story 2 (MtcuteDialogProvider + MtcuteMessageProvider)** — DONE, PR #4 merged to main at `9e244b6`. 28 new tests (94 total). Includes 3 Pi round-5 fixes (R1 pin-peer, R2 test, R3 muted-ordering).
- **Story 3 (wiring in app.ts)** — in flight, branch `real-telegram/story-3-wiring`. See "Current wiring" below.

### Current wiring (after Story 3)

`apps/server/src/app.ts` constructs providers based on `hasRealCreds`:

```ts
export const dialogProvider = hasRealCreds
  ? new MtcuteDialogProvider(() => asMtcuteSurface(telegramAdapter.getClient()))
  : new FixtureDialogProvider()
export const messageProvider = hasRealCreds
  ? new MtcuteMessageProvider(() => asMtcuteSurface(telegramAdapter.getClient()))
  : new InMemoryMessageProvider()
```

Mtcute providers take a `() => MtcuteClientSurface` **thunk** (not a captured client) so the adapter's lazy-init + logout-recreate lifecycle is transparent. See "Known sharp edges" below.

The `telegramAdapter.subscribe(...)` block at app.ts:84 still calls `setAuthState` / `setAuthenticated` on both providers. Mtcute providers no-op these (correct — routes gate on auth). Fixture path unchanged.

## Known sharp edges

Resolved by Story 3's thunk design:

- ~~**Stale client reference after logout.**~~ ~~Mtcute providers held a captured client. After `MtcuteTelegramAdapter.logout()` → re-login, the captured reference was stale.~~ **Resolution:** Thunk-based constructor — client is re-fetched on every call via `telegramAdapter.getClient()`. The sharp edge is precluded by design, not fixed in code.

Still open (carried from earlier rounds):

- **Muted not implemented.** `updateDialog({muted})` throws "not yet implemented". TL path is `account.updateNotifySettings`. Tracked for Story 4+ (or wherever mute lands).
- **200-cap on iterDialogs.** Mtcute dialogs are anti-chronological and capped at 200 in the current implementation. No cursor pagination. Tracked — fixture path returns 5, so the jump to ≤200 prod dialogs is silent.
- **100ms setTimeout race in submitCode/submitPassword.** Should poll `getAuthState()` or await `client.start()` promise. Cosmetic, rare.
- **HTTP-layer auth before prod real-Telegram use.** Public URL → logged-in account is a real attack surface. Server-side app password OR reverse-proxy auth needed. BIG.
- **Per-IP/per-phone rate limits on `/api/auth/*`.** Current rate limit is generic 200/min. Real Telegram code/password endpoints need stricter throttling to reduce flood-wait / account-ban risk.
- **Broader log sanitization.** `sanitizeMtcuteError` covers most paths but `app.ts` selection log line + 100ms-poll path don't sanitize. Low risk in practice (the values logged are booleans), keep an eye.
- **Session directory permissions** (Story 6 territory). `.gitignore` already covers `telewa-session/` etc.
- **Singleton provider lifecycle for mtcute** (Pi Story 1 concern O6). With the thunk design, the lifecycle is encapsulated inside the adapter; providers don't need their own startup/shutdown hooks. Revisit if tests show flakiness from hot-reload.
- **Health/version/project-state strings still say "Phase 0"** + `demoMode: true` + `telegram: "not-configured"`. Cosmetic but misleading in real-mode deploys. Tracked.
- **Story 7 not yet implemented.** Real-time updates (mtcute UpdateHandler → RealtimeRouter) are still pending. Until Story 7 lands, real-Telegram users won't see new messages until they refresh the page.

## File naming convention (project-aware handoffs)

When writing handoffs to Pi (or to any future reviewer), prefix output
files with the project name so they group correctly in `/tmp`:

- `/tmp/telewa-round{N}-{topic}.md` — handoffs from Hermes
- `/tmp/telewa-pi-round{N}-{topic}.md` — verdicts/follow-ups from Pi

Convention applies to ALL files touched in the telewa workflow. Other
projects (bitrix, tailwindcss-probe, autogate) keep their own prefixes.
