# AGENT.md

## Mission

Continue development of the Telegram web client using the integrated uploaded UI/UX as the canonical frontend. Implement the PRD phase by phase without replacing or bypassing the established visual system.

## Current state

- All phases 0-8 are **complete** and verified.
- See `PROJECT_STATE.md` for the authoritative phase status table.
- See `RUNBOOK.md` for deploy / ops / troubleshooting.
- The uploaded onboarding and messenger interface is the primary UI; every backend state is now bound to it.
- State is still in-memory by design (V1); see RUNBOOK §1 for the production swap path.

## Required reading order

1. `PROJECT_STATE.md` — current phase status
2. `RUNBOOK.md` — deploy + ops guide
3. `PRD.md` — product requirements
4. `UI_INTEGRATION.md` — UI integration rules
5. `README.md`
6. Existing contracts and tests

## UI integration rules

- Preserve the current component hierarchy and styling unless a requirement cannot be implemented safely.
- Connect existing UI states to real backend states instead of adding parallel screens.
- Onboarding drives the real phone/code/password/QR authentication flow (`/api/auth/*`).
- Dialog/message fixtures were replaced incrementally via `DialogProvider` / `MessageProvider` adapters and Zod contracts in `packages/contracts`.
- Keep demo-only stakeholder controls behind `DEMO_MODE` and remove them from production builds.
- Do not claim WhatsApp-style delivered/read semantics unless Telegram exposes equivalent truth.
- Do not use WhatsApp or Telegram proprietary logos or brand assets.
- Maintain light/dark behavior and responsive tablet layouts.
- Every new server state must have loading, error, empty, disconnected, and retry UI behavior.

## Security rules

- Telegram API hash, sessions, codes, passwords, cookies, and encryption keys stay server-side.
- Never log message bodies, credentials, or full phone numbers by default. The structured access logger (`apps/server/src/hardening.ts`) emits `method/url/status/ms/ip/requestId` only — no bodies.
- All API and WebSocket payloads require runtime validation (Zod in `packages/contracts`).
- Persistent schema changes require migrations.
- Keep mtcute objects behind a Telegram adapter.
- Hardening middleware is wired globally: CSP + `X-Frame-Options: SAMEORIGIN` + `nosniff` + sliding-window rate limit (200 req / 60s per IP) on `/api/*`.

## Work protocol

1. Inspect current repository state and tests.
2. Define a small vertical slice.
3. Add or update shared contracts first (`packages/contracts/src/index.ts`).
4. Implement server behavior and tests.
5. Bind behavior into the existing UI.
6. Test loading, success, failure, and retry paths.
7. Run gates individually (`bun run format:check && bun run lint && bun run typecheck && bun test && bun run --filter '@telewa/web' build`) — `bun run check` in one shot exceeds the default 60s step.
8. Update `PROJECT_STATE.md` and `CHANGELOG.md`.

## Next concrete slices (beyond V1)

These are the natural follow-ups; pick one per PR:

1. **Persistence** — replace `InMemoryMessageProvider`, `FixtureDialogProvider`, `InMemoryMediaStore`, and `RealtimeBus` with SQLite (existing migrations) + Redis-backed equivalents so state survives restarts and horizontal scaling.
2. **Frontend test suite** — add Vitest + Testing Library coverage for `Messenger.tsx`, `Onboarding.tsx`, and `api.ts`. Server already has 52 tests.
3. **Distributed rate limiter** — swap the in-memory bucket in `apps/server/src/hardening.ts` for a Redis `INCR` + `EXPIRE` so limits survive restarts and apply across replicas.
4. **End-to-end smoke test** — drive the containerized build with Playwright against the SSE stream and confirm `x-request-id` propagation from client to structured log.
5. **Internationalisation** — extract hard-coded English strings from `Messenger.tsx` into a message catalogue and wire `Intl.RelativeTimeFormat` for chat list subtitles.
