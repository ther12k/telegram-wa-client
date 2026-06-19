# AGENT.md

## Mission

Continue development of the Telegram web client using the integrated uploaded UI/UX as the canonical frontend. Implement the PRD phase by phase without replacing or bypassing the established visual system.

## Current state

- Active phase: Phase 0 — UI integrated foundation.
- Next phase: Phase 1 — Secure authentication and session.
- The uploaded onboarding and messenger interface is the primary UI.
- Chats, media, login, and Telegram statuses are still demo behavior.

## Required reading order

1. `PROJECT_STATE.md`
2. `PRD.md`
3. `UI_INTEGRATION.md`
4. `README.md`
5. Existing contracts and tests

## UI integration rules

- Preserve the current component hierarchy and styling unless a requirement cannot be implemented safely.
- Connect existing UI states to real backend states instead of adding parallel screens.
- Onboarding must become the real phone/code/password/QR authentication flow.
- Messenger fixtures must be replaced incrementally through adapters and typed API contracts.
- Keep demo-only stakeholder controls behind `DEMO_MODE` and remove them from production builds.
- Do not claim WhatsApp-style delivered/read semantics unless Telegram exposes equivalent truth.
- Do not use WhatsApp or Telegram proprietary logos or brand assets.
- Maintain light/dark behavior and responsive tablet layouts.
- Every new server state must have loading, error, empty, disconnected, and retry UI behavior.

## Security rules

- Telegram API hash, sessions, codes, passwords, cookies, and encryption keys stay server-side.
- Never log message bodies, credentials, or full phone numbers by default.
- All API and WebSocket payloads require runtime validation.
- Persistent schema changes require migrations.
- Keep mtcute objects behind a Telegram adapter.

## Work protocol

1. Inspect current repository state and tests.
2. Define a small vertical slice.
3. Add or update shared contracts first.
4. Implement server behavior and tests.
5. Bind behavior into the existing UI.
6. Test loading, success, failure, and retry paths.
7. Run `bun run check`.
8. Update `PROJECT_STATE.md` and `CHANGELOG.md`.

## Next exact implementation slice

1. Add SQLite migration runner.
2. Add AES-256-GCM session encryption primitive with tests.
3. Define `TelegramAdapter` authentication interface.
4. Add fake adapter for integration tests.
5. Replace onboarding timeouts with `/api/auth/state`, phone, code, password, QR, cancel, and logout contracts.
6. Keep all Telegram credentials server-only.
