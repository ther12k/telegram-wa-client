#!/usr/bin/env bash
# scripts/run-check.sh
# Execute a `bun run` subcommand inside the `telewa-dev-runner` container.
#
# Usage:
#   ./scripts/run-check.sh                    # bun run check (full pipeline)
#   ./scripts/run-check.sh test               # bun test (server + web)
#   ./scripts/run-check.sh build              # server + web builds
#   ./scripts/run-check.sh lint               # bun run lint
#   ./scripts/run-check.sh typecheck          # bun run typecheck
#   ./scripts/run-check.sh format             # bun run format (auto-fix)
#   ./scripts/run-check.sh shell              # interactive bash in runner
#   ./scripts/run-check.sh update             # git fetch + checkout origin/main
#   ./scripts/run-check.sh <any-bun-script>   # bun run <any-bun-script>
#   ./scripts/run-check.sh -- <cmd>           # raw command inside /workspace
#
# Exit code mirrors the command's exit code inside the runner.

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-telewa-dev-runner}"

if ! docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
  echo "[ERR] $CONTAINER_NAME is not running." >&2
  echo "[ERR] Start it with: ./scripts/dev-runner.sh" >&2
  exit 1
fi

ensure_deps() {
  # `bun install` is needed the first time the runner sees the workspace,
  # and after any `bun.lock` change. Use a sentinel file in the bind-mount
  # so we only re-install when needed.
  #
  # Note: the container is started with `--user $host_uid:$host_gid` so that
  # the bind-mounted workspace is writable. We do NOT override `-u` here —
  # the default user is the one chosen at `docker run` time, which matches
  # the host UID and can write to the bind-mount.
  docker exec -w /workspace "$CONTAINER_NAME" \
    bash -c 'if [ ! -d node_modules ] || [ bun.lock -nt node_modules/.cache/installed ]; then
      echo "[run-check] installing deps (first run or lockfile changed)..."
      bun install --frozen-lockfile
      mkdir -p node_modules/.cache
      touch node_modules/.cache/installed
    fi'
}

case "${1:-check}" in
  shell)
    docker exec -it -w /workspace "$CONTAINER_NAME" bash
    ;;

  --)
    shift
    ensure_deps
    docker exec -it -w /workspace "$CONTAINER_NAME" bash -c "$*"
    ;;

  update)
    ensure_deps
    docker exec -w /workspace "$CONTAINER_NAME" \
      bash -c 'set -e; git fetch --tags origin; git checkout "${BRANCH:-origin/main}"; git log -3 --oneline'
    ;;

  test)
    ensure_deps
    docker exec -w /workspace "$CONTAINER_NAME" bun test
    ;;

  build)
    ensure_deps
    docker exec -w /workspace "$CONTAINER_NAME" \
      bash -c 'set -e; bun --cwd apps/server run build && bun --cwd apps/web run build'
    ;;

  format)
    ensure_deps
    docker exec -w /workspace "$CONTAINER_NAME" bun run format
    ;;

  *)
    subcmd="${1:-check}"
    ensure_deps
    docker exec -w /workspace "$CONTAINER_NAME" bun run "$subcmd"
    ;;
esac
