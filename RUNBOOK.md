# telegram-wa-client — Runbook

Operational guide for deploying, monitoring, and troubleshooting the Telegram-like web messenger.

---

## 1. Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Docker container (port 3001)                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ apps/server (Hono + Bun)                                      │  │
│  │   ├─ /api/auth       — phone → code → 2FA / QR sign-in       │  │
│  │   ├─ /api/dialogs    — GET / PATCH / DELETE                  │  │
│  │   ├─ /api/messages   — GET history / POST send / POST read   │  │
│  │   ├─ /api/media      — POST upload / GET download            │  │
│  │   ├─ /api/search     — GET ?q= (dialogs + messages)          │  │
│  │   └─ /api/realtime   — Server-Sent Events stream             │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │ Hardening middlewares                                         │  │
│  │   ├─ securityHeaders  (CSP, X-Frame-Options, nosniff)        │  │
│  │   ├─ structuredLogger (JSON access logs to stdout)           │  │
│  │   └─ rateLimiter      (200 req / 60s sliding window per IP)  │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │ apps/web/dist  (Vite/React static SPA — served by Hono)      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

All state is in-memory by design (V1); restarting the container resets user data. Replace `FixtureDialogProvider` / `InMemoryMessageProvider` / `InMemoryMediaStore` / `RealtimeBus` with persistent adapters for production.

---

## 2. Build & deploy

### Local single-container build

```bash
./scripts/deploy.sh                       # builds telewa:<short-sha>
docker run -d --name telewa -p 3001:3001 telewa:<short-sha>
```

### Build with explicit tag

```bash
./scripts/deploy.sh --tag v1.2.3
```

### Push to registry

```bash
export REGISTRY=docker.io/myorg
./scripts/deploy.sh --push --tag v1.2.3
# image: docker.io/myorg/telewa:v1.2.3
```

### Ship to remote host without registry (save/load via ssh)

```bash
export SSH_HOST=deploy@telewa.example.com
./scripts/deploy.sh --ssh "$SSH_HOST" --tag v1.2.3
ssh "$SSH_HOST" "docker run -d --name telewa -p 3001:3001 --restart unless-stopped telewa:v1.2.3"
```

### Build args (already wired into Dockerfile)

| arg           | default   | purpose                                      |
| ------------- | --------- | -------------------------------------------- |
| `APP_VERSION` | `dev`     | version stamped into `APP_VERSION` env var   |
| `APP_COMMIT`  | `unknown` | commit sha stamped into `APP_COMMIT` env var |

---

## 3. Health checks

| Endpoint        | Returns                                  | Use for          |
| --------------- | ---------------------------------------- | ---------------- |
| `/health/live`  | `{ status: "live", timestamp }`          | process liveness |
| `/health/ready` | `{ status: "ready", database, runtime }` | readiness probe  |

The container's `HEALTHCHECK` pings `/health/live` every 30s.

```bash
curl -fsS http://localhost:3001/health/live
curl -fsS http://localhost:3001/health/ready
```

---

## 4. Observability

### Structured access logs

Every request emits a single JSON line to stdout:

```json
{
  "timestamp": "2026-06-20T05:44:00.111Z",
  "requestId": "a704afd1-abf6-423b-9a03-945e8b556efb",
  "method": "GET",
  "url": "http://localhost/api/auth/state",
  "status": 200,
  "durationMs": 2.58,
  "ip": "127.0.0.1"
}
```

Pipe stdout into your log collector (Loki, Datadog, journald). Filter on `status >= 400` for errors or `durationMs > 250` for slow requests.

### Request correlation

`x-request-id` is set on every request (echoed back as a response header). Capture it client-side and include in bug reports — it links logs to a single user action.

---

## 5. Operations

### Roll back

```bash
# On the host:
docker stop telewa
docker run -d --name telewa -p 3001:3001 telewa:<previous-good-tag>
```

State resets on every container start (in-memory only) — back-compat with user data is not a V1 concern.

### Scale horizontally

The current build is single-process (in-memory bus, in-memory rate limiter). For horizontal scale: front it with a sticky-session reverse proxy and swap the in-memory providers for Redis-backed equivalents. Until then: one replica only.

### Reset stuck rate limiter

Restart the container — the bucket map lives in process memory.

---

## 6. Troubleshooting

| Symptom                                   | Likely cause                        | Fix                                                                 |
| ----------------------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `429 RATE_LIMIT_EXCEEDED` everywhere      | Legitimate burst / shared egress IP | Lower `maxRequests` only if needed; raise per-IP for load tests     |
| `AUTH_REQUIRED` on every request          | Container restarted — session gone  | Re-run phone/code flow (sessions are in-memory)                     |
| `CSP` blocks frontend assets in dev       | Local Vite uses unsafe-inline HMR   | Use `bun run dev` (separate CSP-disabled profile) not the container |
| `Cannot find module '@telewa/contracts'`  | Build cache stale                   | `docker build --no-cache -t telewa:test .`                          |
| `bun --cwd apps/server run start` exits 1 | Missing `dist/` (build skipped)     | Re-run `bun run build` before `docker build`                        |
| Frontend 404s on `/api/*`                 | Reverse proxy not forwarding path   | Proxy: `location /api/ { proxy_pass http://telewa:3001; }`          |

### Quick diagnosis recipe

```bash
# 1. Is the container up?
docker ps --filter name=telewa

# 2. Is the process healthy inside?
docker exec telewa curl -fsS http://127.0.0.1:3001/health/live

# 3. Last 50 log lines, JSON-pretty
docker logs --tail 50 telewa | jq .

# 4. Filter slow / failing requests
docker logs telewa | jq 'select(.status >= 500 or .durationMs > 250)'
```

---

## 7. Test / CI matrix

Run locally before pushing a tag:

```bash
bun run typecheck          # all workspaces
bun test                    # server: 52 tests
bun run --filter '@telewa/web' build
```

`bun run check` runs format + lint + typecheck + test + build but exceeds the 60s default CI step — invoke each step individually.

---

## 8. Versioning

- `package.json` (root) `version` field is the source of truth for `APP_VERSION`.
- Docker image is tagged with `<short-sha>` by default; pass `--tag vX.Y.Z` for releases.
- Bump the root `version`, commit, tag, then `./scripts/deploy.sh --tag vX.Y.Z --push`.
