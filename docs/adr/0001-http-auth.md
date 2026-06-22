# ADR 0001: HTTP Auth for /api and /events Endpoints

**Status:** Proposed
**Date:** 2026-06-22

## Context

`telewa` runs the Hono server on `0.0.0.0:3001` (or `3101` via Docker port
forward) and currently exposes the full `/api/*` surface without authentication
beyond the in-process auth state machine. The SPA loads from the same origin.

Once real Telegram credentials are configured, the session database contains the
`auth_key` for the logged-in account. Anyone who reaches the host on the exposed
port can read and write Telegram messages, change auth state, or trigger
account-damaging actions. SSH port-forwarding (`deploy.sh`) and Docker `EXPOSE`
make the assumption "the operator is the only user" easy to break.

This ADR must be settled before Story 7 (`MtcuteRealtimeProvider`) ships
SSE message streaming, because SSE on an unauthenticated endpoint is the
most damaging variant of the same risk.

## Decision

Apply **shared-secret bearer token** authentication to all `/api/*` and `/events`
endpoints, sourced from the `AUTH_TOKEN` environment variable.

- **Token shape:** opaque, ≥ 32 bytes random, base64url-encoded.
- **Transport:** `Authorization: Bearer <token>` on every protected request.
- **Public routes:** `/health/live`, `/health/ready`, static SPA assets.
- **SPA:** stores the token in a session-scoped JS variable after first prompt
  (or reads it from a config endpoint gated by a separate challenge in single-user
  mode — see "Token delivery" below).
- **Comparison:** constant-time.
- **Rotation:** restart with a new `AUTH_TOKEN`; old sessions must re-auth.
- **Logging:** token is sanitized out of all request logs.

### Token delivery (single-user, single-host)

The simplest model that fits this project:

1. Operator generates a token and writes it to `.env` as `AUTH_TOKEN=...`
   before starting the container.
2. The SPA prompts for the token on first load (stored in
   `sessionStorage`, NOT `localStorage`, so it does not persist across browser
   restarts).
3. The token travels in `Authorization` headers on every API call.

This keeps the deployment model simple. It does NOT add a login screen,
password reset, or account model. That is intentional for V1 — a separate
ADR can introduce multi-user auth later if needed.

### Why not the alternatives

- **Reverse-proxy auth (nginx basic auth, Cloudflare Access):** couples
  telewa to infra choices; harder to test locally.
- **JWT / OAuth2:** heavier than V1 needs. Adds a token-issuing flow that
  requires a UI surface we do not have.
- **No auth, "local-only" assumption:** fails the moment the operator
  exposes the port or SSHes elsewhere. The session DB is a credential;
  the assumption does not match the threat model.

## Consequences

- All clients (SPA, curl, scripts) must set `Authorization: Bearer $AUTH_TOKEN`.
- A wrong/missing token returns 401 on protected routes. `/health/*` and
  static assets remain anonymous for liveness probes and asset caching.
- A future change to multi-user auth can replace this middleware without
  changing route handlers — the contract is the bearer token, not the
  auth scheme.
- Story 7 (real-time SSE) ships with the same middleware applied; the
  `EventSource` browser API does not support custom headers, so the
  token is passed as a query parameter for `/events` only and rejected
  on all other endpoints.

## Open questions

- Should the SPA store the token in `sessionStorage` (cleared on browser
  restart) or `localStorage` (persists until explicitly cleared)? Proposal:
  `sessionStorage` — the token is re-prompted on each new browser session.
- Should we add a server-side rate limit to the token-prompt page? Not for
  V1 — the prompt is a local-only modal, not a public endpoint.

## Rollout

1. Land this ADR.
2. Land Story 5b (HTTP auth middleware) on its own PR.
3. Land Story 7 (real-time SSE) referencing this ADR for the auth contract.
4. Document `AUTH_TOKEN` in the RUNBOOK.
