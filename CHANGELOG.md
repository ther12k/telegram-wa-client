# Changelog

## 0.2.0 — 2026-06-19

- Integrated the uploaded WhatsApp-inspired Telegram UI as the primary frontend.
- Preserved onboarding, messenger, media, settings, dark mode, responsive, and state-demo interactions.
- Added Hono API foundation and shared Zod contracts.
- Added backend connectivity and current phase display.
- Connected optimistic demo message sending to a validated server acknowledgement.
- Added project state, UI integration map, agent rules, tests, CI, and Docker starter.
- Fixed Phase 0 strict-TypeScript gaps surfaced by `bun run check`: server tsconfig now uses `@types/bun` (`bun` types entry), `people` typed with explicit keys for `noUncheckedIndexedAccess`, string-index access sites cast to `keyof typeof people`, demo reply text guarded against undefined array lookup, emoji picker guarded against undefined tab, and two empty `catch` blocks annotated with intent comments.
