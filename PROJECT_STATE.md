# Project State

**Updated:** 2026-06-26
**Version:** 0.4.0
**Active phase:** Real Telegram integration — all 7 stories shipped
**Status:** Fully implemented, verified, and hardened.

## Phase status

| Phase              | Status    | Notes                                                                                                                           |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 0. Foundation      | Completed | Uploaded UI is integrated with Hono, shared contracts, API connectivity, tests, CI, and Docker. `bun run check` passes locally. |
| 1. Authentication  | Completed | Real onboarding auth state machine backend/frontend + encrypted session storage + fake Telegram adapter.                        |
| 2. Dialogs         | Completed | Mutable in-memory dialogs + mutations (PATCH/DELETE) + list endpoints, fully integrated into frontend.                          |
| 3. Messaging       | Completed | sendMessage, history fetch, optimistic UI, read marking.                                                                        |
| 4. Real-time       | Completed | SSE realtime event stream + real Telegram real-time via MtcuteRealtimeProvider (Story 7).                                       |
| 5. Media           | Completed | Media upload/download proxy, kind derivation, dynamic file layout bubbles, upload spinners.                                     |
| 6. V1 interactions | Completed | Global search (peers + message content), contact action menus, settings.                                                        |
| 7. Hardening       | Completed | CSP headers, rate-limiting, structured JSON access logs, bearer token auth middleware (Story 5b), frontend login gate.          |
| 8. Release         | Completed | Multi-stage Docker image, deploy.sh build/push/ssh runner, RUNBOOK.md ops guide, Docker volume mount (Story 6).                |

## Real Telegram integration (stories)

| Story | Description                        | Status    |
| ----- | ---------------------------------- | --------- |
| 1     | mtcute deps + TelegramAdapter      | Shipped   |
| 2     | MtcuteDialogProvider + Message     | Shipped   |
| 3     | Wiring in app.ts                   | Shipped   |
| 3.1   | SPA static fallback                | Shipped   |
| 3.2   | QR login                           | Shipped   |
| 5b    | Bearer token auth middleware       | Shipped   |
| 5b UI | Frontend login gate                | Shipped   |
| 6     | Docker volume mount                | Shipped   |
| 7     | MtcuteRealtimeProvider (SSE)       | Shipped   |

## Next slices (planned)

1. Frontend test suite (Vitest + Testing Library)
2. Persistence — SQLite/Redis providers replacing in-memory stores
3. Distributed rate limiter (Redis)
4. E2E smoke test (Playwright)
5. Internationalisation

## Commits since v0.2.0 (16 commits, 6 PRs)

```
fc6ee75 feat(mtcute): real Telegram adapter — Story 1 of 7 (#3)
9e244b6 feat(providers): MtcuteDialogProvider + MtcuteMessageProvider (#4)
9061d20 feat(wiring): swap Fixture/InMemory for Mtcute providers (#5)
6024834 feat(static): serve built SPA with SPA fallback (Story 3.1) (#6)
32bc9a9 feat(qr): real QR login (Story 3.2) (#7)
837710f fix(mtcute): allow negative chatId + subscribe to interface (#9)
0296788 chore(release): sync version to 0.3.2 + refresh stale /api/* (#10)
c73b203 docs(adr): 0001 HTTP auth — bearer token (#11)
1f90603 feat(auth): bearer token middleware (Story 5b)
f693991 feat(login): frontend login gate (Story 5b frontend)
e58e476 feat(realtime, docker): MtcuteRealtimeProvider + volume mount (Stories 6+7)
```
