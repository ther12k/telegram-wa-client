# Telegram WA Web — UI Integrated Starter

This repository integrates the uploaded WhatsApp-inspired Telegram design as the primary frontend of the self-hosted Telegram client project.

## What is integrated

- Complete onboarding presentation flow.
- Responsive messenger layout and navigation rail.
- Chat filters, search, unread badges, context menus, dark mode, settings, contact info, media viewer, emoji picker, reply UI, voice/document/image/sticker presentation, overlays, and demo network states.
- Hono backend foundation.
- Shared Zod contracts.
- Live backend connectivity indicator.
- Server-acknowledged demo message sending with optimistic UI and failure state.
- Project-state and health APIs.

## Current boundary

The visual system is integrated, but Telegram authentication and MTProto data are not yet connected. All chats and media remain demo fixtures. The onboarding screens will be connected to the real Phase 1 authentication state machine next.

## Run

```bash
cp .env.example .env
bun install
bun run dev
```

Open `http://localhost:5173`.

API endpoints:

- `GET http://localhost:3001/health/live`
- `GET http://localhost:3001/health/ready`
- `GET http://localhost:3001/api/version`
- `GET http://localhost:3001/api/project-state`

## Validate

```bash
bun run check
```

Read `PROJECT_STATE.md`, `AGENT.md`, and `PRD.md` before implementing the next phase.
