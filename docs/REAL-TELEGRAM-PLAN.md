HANDOFF
Branch: N/A (planning handoff — not a code change yet)
Commit: N/A
Working tree: not relevant (main, be7cf93, clean — no diff this round)
Project path: /home/ther12k/Workspace/Learning/telegram-wa-client
(the wrapper auto-map picks `bitrix` for this container path; set PI_PROJECT_DIR explicitly to the real repo)

## Context

- Project telegram-wa-client is a WhatsApp-style Telegram web client
- Current state: complete UI + in-memory fake backend (FakeTelegramAdapter + FixtureDialogProvider + InMemoryMessageProvider). Live at https://telewa.halotec.my.id/ with 5 hardcoded dialogs and code 11111 for "login"
- PRD §1: "powered by Bun, Hono, mtcute, React, and shadcn/ui. The user authenticates with their Telegram account via the MTProto protocol"
- User message (2026-06-21): "we need real telegram as that the point this app created"
- The fake adapter already implements the right interface (apps/server/src/adapters/telegram.ts); the work is swap-and-wire, not greenfield
- AGENT.md security rule: "Telegram API hash, sessions, codes, passwords, cookies, and encryption keys stay server-side"
- No prd-\*.json tracker; project uses PROJECT_STATE.md for phase status
- Health endpoint currently reports: "telegram":"not-configured","ui":"integrated","demoMode":true

## Project context for Pi

- Repo: github.com/ther12k/telegram-wa-client (public)
- Host path: /home/ther12k/Workspace/Learning/telegram-wa-client
- Branch: main, HEAD: be7cf93, working tree clean
- Stack: Bun 1.3.14 + Hono 4.12.26 + React (Vite) + shadcn/ui + mtcute (per PRD)
- Monorepo: apps/server (Hono), apps/web (React), packages/contracts (zod schemas)
- Existing interfaces ready for the swap:
  - apps/server/src/adapters/telegram.ts — TelegramAdapter (6 methods: getAuthState, sendCode, submitCode, submitPassword, startQrLogin, logout)
  - apps/server/src/adapters/messages.ts — MessageProvider (4 methods: getHistory, sendMessage, markRead, searchMessages)
  - apps/server/src/adapters/dialogs.ts — DialogProvider (with updateDialog + deleteDialog)
  - apps/server/src/adapters/fake-telegram.ts — current FakeTelegramAdapter (will be replaced)
- Outstanding user input: api_id + api_hash from https://my.telegram.org (not yet obtained — blocking actual login test, not implementation)

## Proposed 7-story implementation plan

Each story: code in sandbox → bun run check → send-to-pi review → fix required items → commit → next story.

Story 1: Add mtcute deps + env scaffolding
Files: apps/server/package.json, .env.example, docker-compose.yml

- `bun add @mtcute/node @mtcute/sqlite`
- Add `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` to .env.example with placeholder comments
- Pass both env vars in docker-compose.yml `environment:` block
- Verification: `bun install` succeeds, `bun run check` clean, no new lint errors

Story 2: Implement MtcuteTelegramAdapter skeleton
File: apps/server/src/adapters/mtcute-telegram.ts

- Wraps `@mtcute/node`'s TelegramClient; implements all 6 TelegramAdapter methods
- SQLite session storage via `@mtcute/sqlite`
- Env-driven config; throws clear error if TELEGRAM_API_ID/TELEGRAM_API_HASH missing
- Unit tests: can mock the client interface

Story 3: Replace FakeTelegramAdapter in app.ts (safe fallback)

- Wire MtcuteTelegramAdapter as primary adapter
- Safe fallback: if env vars missing, use FakeTelegramAdapter with `console.warn` at startup
- This makes the deploy safe in either state (real creds = real Telegram, missing creds = demo mode)
- Verification: `bun run check`; all 6 /api/auth/\* endpoints still respond

Story 4: Implement MtcuteDialogProvider
File: apps/server/src/adapters/mtcute-dialogs.ts

- Replaces FixtureDialogProvider
- Calls `client.getDialogs()` to sync; maps Telegram types (user/chat/channel/supergroup) to existing Dialog schema
- Pagination via Telegram's offset/limit
- Returns empty + clear auth error if not authenticated
- updateDialog / deleteDialog call Telegram's pin/archive/mute/delete APIs

Story 5: Implement MtcuteMessageProvider
File: apps/server/src/adapters/mtcute-messages.ts

- Replaces InMemoryMessageProvider
- getHistory → client.getMessages() (handles pagination via offsetId)
- sendMessage → client.sendMessage() (text, media via mediaId, replyTo)
- searchMessages → client.iterMessages({search: q})
- markRead → client.readHistory()

Story 6: Persist session via Docker volume
File: docker-compose.yml

- Mount a volume for the SQLite session DB: `./telewa-session:/app/sessions`
- Verification: log in once, restart container, still authenticated
- Per AGENT.md security rule: session DB never leaves halotec, never in git

Story 7: Wire mtcute UpdateHandler to RealtimeRouter
File: apps/server/src/adapters/mtcute-realtime.ts

- client.addUpdateHandler() → translate `NewMessage`, `MessageEdited`, `MessageDeleted` → existing RealtimeEvent union
- Push to existing RealtimeRouter subscribers (SSE / WebSocket — TBD per Pi's recommendation)
- No frontend changes needed (Messenger.tsx already consumes RealtimeEvent)

## Per-story review loop (per project workflow + skill)

1. Code in sandbox
2. `bun run check` (lint + typecheck + test + build) — all 4 gates
3. Commit on a branch
4. send-to-pi review-only → fix required items → re-send
5. Commit fix per item
6. Merge to main after Pi says "Required fixes: None"

## Open questions for Pi

1. mtcute still the right pick? PRD §1 says mtcute, but ecosystem moves. 2026 alternatives worth considering: gramjs, TDLib, tdl. Any reason to revisit?
2. mtcute + Bun: are there known compatibility issues? Bun's incomplete Node API surface can break native deps. Did prior mtcute users hit this?
3. Session storage: @mtcute/sqlite (third-party wrapper) vs bun:sqlite (built-in) vs better-sqlite3 (Node classic) — which is most reliable in production?
4. Real-time strategy: existing RealtimeRouter is SSE-shaped. mtcute's update dispatcher pushes events; we need to fan out. Keep SSE or move to WebSocket? Any mtcute idiomatic pattern?
5. Test strategy with a real Telegram account: auth flow needs real SMS. Options: (a) mock the client in unit tests only and never integration-test, (b) use a sandbox DC (mtcute supports test servers?), (c) real account on a test user (interactive — blocks CI). What's the project's bar?
6. Single-user assumption from PRD §3: current code lets anyone log in as `me` via code 11111. With real Telegram, this becomes a real account. Does the project need auth at the HTTP layer now (or just rely on Telegram's session being a single-user thing)?

## Concerns I want flagged

- Auth flow is interactive (real SMS to phone) — hard to CI-test
- Flood waits on new sessions could make iteration painful during dev
- Story 3's demo-mode fallback means prod can silently run on FakeTelegramAdapter if creds are wrong — safety net or footgun? Should we add a startup log line that loudly says "RUNNING WITH FAKE TELEGRAM ADAPTER"?
- api_id + api_hash are sensitive (Telegram bans apps that abuse them). Local .env is fine; Pi will read from `~/.config/telewa/.env` on host, never echoed
- Current Dockerfile sets `NODE_ENV=production` but server code uses `APP_ENV` for some gates — should we normalize to NODE_ENV while we're touching this?

## Request: review-only

Read the plan, answer the 6 open questions, flag any concerns I missed. After your reply, I'll implement Story 1 in the sandbox and send the diff for review.
