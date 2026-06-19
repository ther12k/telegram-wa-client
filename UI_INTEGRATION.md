# UI/UX Integration Map

## Source

The uploaded package `whatsapp-inspired-telegram-ui-design (1).zip` is integrated into `apps/web`.

## Canonical component mapping

| Product capability             | Integrated component                       |
| ------------------------------ | ------------------------------------------ |
| Login and first-run experience | `components/Onboarding.tsx`                |
| Main messenger shell           | `components/Messenger.tsx`                 |
| Shared overlays and panels     | `components/Panels.tsx`                    |
| Demo domain fixtures           | `data.ts`                                  |
| Theme and visual tokens        | `index.css`                                |
| Backend integration            | `api.ts` and API status logic in `App.tsx` |

## Integration decisions

- The uploaded UI remains visually authoritative.
- Existing timeouts and fixture state are transitional adapters, not final product logic.
- Server state is connected through typed shared contracts.
- Demo message sending now requires a successful Hono acknowledgement.
- Backend connectivity and current project phase are visible in the UI.
- Vite proxies `/api` and `/health` to the Hono development server.
- The single-file build plugin was removed because the application is deployed as a normal web bundle served by Hono.

## Phase 1 binding plan

- Phone form → `POST /api/auth/phone/start`
- Code form → `POST /api/auth/code/submit`
- Password form → `POST /api/auth/password/submit`
- QR view → `POST /api/auth/qr/start` and refresh
- App startup → `GET /api/auth/state`
- Logout → `POST /api/auth/logout`

No separate authentication UI should be created unless the current design lacks a required secure state.
