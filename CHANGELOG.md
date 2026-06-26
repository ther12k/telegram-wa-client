# Changelog

## 0.4.0 — 2026-06-26

- Story 1: Added mtcute deps + real Telegram adapter behind `TelegramAdapter` interface (#3)
- Story 2: `MtcuteDialogProvider` + `MtcuteMessageProvider` with `MtcuteClientSurface` interface (#4)
- Story 3: Wiring — swapped Fixture/InMemory for Mtcute providers when real creds present (#5)
- Story 3.1: Serve built SPA from apps/web/dist with SPA fallback (#6)
- Story 3.2: Real Telegram QR login via `auth.exportLoginToken` + `acceptLoginToken` poll (#7)
- Story 5b: Bearer token auth middleware for `/api/*` and `/events` (ADR 0001) + frontend login gate (#12, #13)
- Story 6: Docker volume mount for mtcute session persistence (#14)
- Story 7: `MtcuteRealtimeProvider` — real-time Telegram updates via mtcute EventEmitter → SSE bus (#14)
- Fix: Allow negative chatId in `parseChatId` + add `subscribe` to `TelegramAdapter` interface (#9)
- Fix: Docker workspace filter for server build and runtime CMD
- Doc: ADR 0001 — HTTP bearer token auth
- CD: Dev runner image with UID-aware bind-mount

## 0.3.0 — 2026-06-21

- Mtcute adapter + providers + wiring shipped

## 0.2.1 — 2026-06-20

- Docker build fixes

## 0.2.0 — 2026-06-19

- Integrated the uploaded WhatsApp-inspired Telegram UI as the primary frontend.
- Preserved onboarding, messenger, media, settings, dark mode, responsive, and state-demo interactions.
- Added Hono API foundation and shared Zod contracts.
- Added backend connectivity and current phase display.
- Connected optimistic demo message sending to a validated server acknowledgement.
- Added project state, UI integration map, agent rules, tests, CI, and Docker starter.
- Fixed Phase 0 strict-TypeScript gaps surfaced by `bun run check`.
