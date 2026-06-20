#!/usr/bin/env bash
# scripts/dev-runner.sh
# Build + start a long-lived `telewa-dev-runner` container that runs the
# full Bun toolchain (oven/bun:1.3.14, glibc 2.36+, ESLint 10 compatible).
#
# Idempotent. Safe to re-run. The container mounts the current working
# directory (the telegram-wa-client checkout) at /workspace and stays alive
# via `tail -f /dev/null` so `scripts/run-check.sh <subcmd>` can `exec` into it.
#
# Usage:
#   ./scripts/dev-runner.sh           # build + start (if not running)
#   ./scripts/dev-runner.sh rebuild   # force image rebuild (no cache)
#   ./scripts/dev-runner.sh stop      # stop + remove container
#   ./scripts/dev-runner.sh logs      # tail container logs
#   ./scripts/dev-runner.sh status    # show container + image state

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-telewa-dev-runner}"
IMAGE_NAME="${IMAGE_NAME:-telewa-dev-runner:latest}"
WORKDIR="${WORKDIR:-$(pwd)}"

if [[ ! -d "$WORKDIR" ]]; then
  echo "[ERR] WORKDIR does not exist: $WORKDIR" >&2
  exit 1
fi

if [[ ! -f "$WORKDIR/package.json" ]] || [[ ! -f "$WORKDIR/bun.lock" ]]; then
  echo "[ERR] $WORKDIR does not look like the telegram-wa-client monorepo" >&2
  echo "[ERR] (missing package.json or bun.lock)" >&2
  exit 1
fi

cmd="${1:-up}"

container_running() {
  docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"
}

container_exists() {
  docker ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"
}

image_exists() {
  docker image inspect "$IMAGE_NAME" >/dev/null 2>&1
}

build_image() {
  local nocache="${1:-}"
  echo "[dev-runner] Building $IMAGE_NAME from $WORKDIR/Dockerfile.runner ..."
  if [[ -n "$nocache" ]]; then
    docker build --no-cache -f "$WORKDIR/Dockerfile.runner" -t "$IMAGE_NAME" "$WORKDIR"
  else
    docker build -f "$WORKDIR/Dockerfile.runner" -t "$IMAGE_NAME" "$WORKDIR"
  fi
}

start_container() {
  echo "[dev-runner] Starting $CONTAINER_NAME (mount: $WORKDIR -> /workspace) ..."
  # Match host UID:GID so the bind-mount is writable from inside the container.
  # Default container user (`bun`, UID 1000) cannot write to a host dir owned
  # by an arbitrary host user (e.g. UID 1003 on halotec). Using the host UID
  # keeps bind-mounted files owned by the same user outside and inside.
  local host_uid host_gid
  host_uid="$(id -u)"
  host_gid="$(id -g)"

  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --label "telewa.role=dev-runner" \
    --user "$host_uid:$host_gid" \
    -v "$WORKDIR:/workspace" \
    -w /workspace \
    -e CI=1 \
    -e NODE_ENV=development \
    -e HOME=/tmp \
    "$IMAGE_NAME" \
    tail -f /dev/null

  # Bridge network access so container can reach halotec NPM-proxy DNS names.
  if docker network inspect bridge >/dev/null 2>&1; then
    echo "[dev-runner] Connecting $CONTAINER_NAME to bridge network ..."
    docker network connect bridge "$CONTAINER_NAME" 2>/dev/null || true
  fi
}

case "$cmd" in
  up)
    if container_running; then
      echo "[dev-runner] $CONTAINER_NAME already running"
      docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
      exit 0
    fi
    if container_exists; then
      echo "[dev-runner] Removing stopped $CONTAINER_NAME ..."
      docker rm "$CONTAINER_NAME" >/dev/null
    fi
    if ! image_exists; then
      build_image
    else
      echo "[dev-runner] Image $IMAGE_NAME already present"
    fi
    start_container
    echo "[dev-runner] Ready. Try: ./scripts/run-check.sh"
    ;;

  rebuild)
    if container_running; then
      echo "[dev-runner] Stopping $CONTAINER_NAME first ..."
      docker stop "$CONTAINER_NAME" >/dev/null
    fi
    if container_exists; then
      docker rm "$CONTAINER_NAME" >/dev/null
    fi
    build_image --no-cache
    start_container
    echo "[dev-runner] Rebuilt. Image + container fresh."
    ;;

  stop)
    if container_running; then
      echo "[dev-runner] Stopping $CONTAINER_NAME ..."
      docker stop "$CONTAINER_NAME" >/dev/null
    fi
    if container_exists; then
      docker rm "$CONTAINER_NAME" >/dev/null
    fi
    echo "[dev-runner] Stopped."
    ;;

  logs)
    docker logs -f "$CONTAINER_NAME"
    ;;

  status)
    echo "[dev-runner] === container ==="
    if container_running; then
      docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}"
    else
      echo "  (not running)"
    fi
    echo "[dev-runner] === image ==="
    if image_exists; then
      docker image inspect "$IMAGE_NAME" --format "  id: {{.Id}}\n  created: {{.Created}}\n  size: {{.Size}}"
    else
      echo "  (not built)"
    fi
    ;;

  shell)
    if ! container_running; then
      echo "[ERR] $CONTAINER_NAME not running. Run: ./scripts/dev-runner.sh" >&2
      exit 1
    fi
    docker exec -it -w /workspace "$CONTAINER_NAME" bash
    ;;

  *)
    echo "Usage: $0 {up|rebuild|stop|logs|status|shell}" >&2
    exit 2
    ;;
esac
