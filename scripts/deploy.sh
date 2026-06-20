#!/usr/bin/env bash
# scripts/deploy.sh — build + ship a versioned Docker image for telegram-wa-client.
#
# Usage:
#   ./scripts/deploy.sh                 # build image: telewa:<short-sha> locally
#   ./scripts/deploy.sh --push          # push to $REGISTRY (docker.io/$REGISTRY/telewa:tag)
#   ./scripts/deploy.sh --ssh host      # scp image + remote load on host
#   ./scripts/deploy.sh --tag v1.2.3    # override version tag
#
# Required env (when --push / --ssh used):
#   REGISTRY  e.g. docker.io/myorg
#   SSH_HOST  user@hostname

set -euo pipefail

# ── args ───────────────────────────────────────────────────────────────────────
PUSH=0
SSH_HOST=""
TAG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --push) PUSH=1; shift ;;
    --ssh)  SSH_HOST="${2:-}"; [[ -z "$SSH_HOST" ]] && { echo "ERROR: --ssh needs host"; exit 1; }; shift 2 ;;
    --tag)  TAG="${2:-}"; shift 2 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \?//'
      exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── metadata ───────────────────────────────────────────────────────────────────
SHORT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'local')"
[[ -z "$TAG" ]] && TAG="${SHORT_SHA}"
IMAGE="telewa:${TAG}"

# Inject build args into the build itself
echo ">>> Building ${IMAGE} (sha=${SHORT_SHA})"
docker build \
  --build-arg "APP_VERSION=${TAG}" \
  --build-arg "APP_COMMIT=${SHORT_SHA}" \
  -t "${IMAGE}" \
  -t "telewa:latest" \
  .

# ── push to registry ───────────────────────────────────────────────────────────
if [[ "${PUSH}" -eq 1 ]]; then
  [[ -z "${REGISTRY:-}" ]] && { echo "ERROR: REGISTRY env var required for --push"; exit 1; }
  REMOTE_IMAGE="${REGISTRY}/telewa:${TAG}"
  echo ">>> Tagging + pushing ${REMOTE_IMAGE}"
  docker tag "${IMAGE}" "${REMOTE_IMAGE}"
  docker push "${REMOTE_IMAGE}"
fi

# ── ship via ssh (save/load) ──────────────────────────────────────────────────
if [[ -n "${SSH_HOST}" ]]; then
  TAR_NAME="telewa-${TAG}.tar"
  echo ">>> Saving image to ${TAR_NAME}"
  docker save "${IMAGE}" -o "${TAR_NAME}"

  echo ">>> Copying + loading on ${SSH_HOST}"
  scp "${TAR_NAME}" "${SSH_HOST}:/tmp/${TAR_NAME}"
  ssh "${SSH_HOST}" "docker load -i /tmp/${TAR_NAME} && rm /tmp/${TAR_NAME}"

  rm "${TAR_NAME}"
fi

echo ">>> Deploy artifacts ready: ${IMAGE}"
echo "    run with:  docker run -d --name telewa -p 3001:3001 ${IMAGE}"
