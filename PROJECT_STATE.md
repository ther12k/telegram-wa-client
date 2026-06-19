# Project State

**Updated:** 2026-06-19  
**Version:** 0.2.0  
**Active phase:** Phase 0 — UI integrated foundation  
**Status:** Integrated and undergoing validation

## Phase status

| Phase              | Status                | Notes                                                                                                                                                                   |
| ------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Foundation      | In progress           | Uploaded UI is integrated with Hono, shared contracts, API connectivity, tests, CI, and Docker. `bun run check` passes locally (format, lint, typecheck, tests, build). |
| 1. Authentication  | Not started           | Existing onboarding UI will become the real auth state machine.                                                                                                         |
| 2. Dialogs         | UI prototype complete | Fixtures exist; Telegram-backed dialogs are not implemented.                                                                                                            |
| 3. Messaging       | API-connected demo    | Optimistic UI receives a Hono acknowledgement; no Telegram send yet.                                                                                                    |
| 4. Real-time       | UI states only        | Reconnecting/offline presentations exist; WebSocket reconciliation is pending.                                                                                          |
| 5. Media           | UI prototype complete | Media cards/viewers exist; upload and proxy endpoints are pending.                                                                                                      |
| 6. V1 interactions | UI prototype partial  | Search, settings, context menus, emoji, voice presentation exist as demo behavior.                                                                                      |
| 7. Hardening       | Partial               | Shared validation and safe errors exist; security/a11y review is pending.                                                                                               |
| 8. Release         | Not started           | Docker starter is included, not production certification.                                                                                                               |

## Integrated from uploaded design

- Onboarding screens.
- Desktop and tablet messenger shell.
- Navigation rail and chat list.
- Search and filters.
- Message bubbles and statuses.
- Reply, image, video, document, voice, sticker, and system message presentation.
- Contact info, settings, media viewer, emoji picker, and context menus.
- Light and dark themes.
- Loading, error, empty, offline, and reconnecting presentation states.

## Backend integration completed

- Hono API foundation.
- Health, readiness, version, and project-state endpoints.
- Shared Zod contracts.
- Frontend backend-connectivity indicator.
- Server-validated demo send endpoint.
- Optimistic send transitions to sent only after backend acknowledgement.

## Still mocked

- Telegram login, QR, and 2FA.
- mtcute client lifecycle.
- SQLite session storage.
- Dialog/message/media retrieval.
- Telegram send/read/status semantics.
- WebSocket update stream and reconnect reconciliation.
- Upload/download media proxy.

## Next exact task

Implement Phase 1 authentication behind the existing onboarding UI, beginning with migrations, encrypted session storage, auth contracts, and a fake Telegram adapter.
