#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[landing-page:update] %s\n' "$*"
}

fail() {
  printf '[landing-page:update] ERROR: %s\n' "$*" >&2
  exit 1
}

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd -- "$SCRIPT_DIR/.." && pwd)}"
SERVICE_NAME="${SERVICE_NAME:-}"
DEPLOY_DIR="${DEPLOY_DIR:-}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"

cd "$APP_DIR"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "$APP_DIR is not a git checkout"

if [[ "$ALLOW_DIRTY" != "1" ]] && [[ -n "$(git status --porcelain)" ]]; then
  fail "working tree has local changes; commit/stash them or rerun with ALLOW_DIRTY=1"
fi

current_branch="$(git branch --show-current)"
[[ -n "$current_branch" ]] || fail "checkout is detached; check out a branch before updating"

log "updating $APP_DIR on branch $current_branch"
git fetch --prune origin
git pull --ff-only

for required_file in index.html styles.css app.js assets/home-apps.svg; do
  [[ -f "$required_file" ]] || fail "missing required file after update: $required_file"
done

if [[ -n "$DEPLOY_DIR" ]]; then
  log "copying static files to $DEPLOY_DIR"
  install -d "$DEPLOY_DIR/assets"
  cp index.html styles.css app.js "$DEPLOY_DIR/"
  cp assets/home-apps.svg "$DEPLOY_DIR/assets/"
fi

if [[ -n "$SERVICE_NAME" ]]; then
  command -v systemctl >/dev/null 2>&1 || fail "systemctl is not available; cannot restart $SERVICE_NAME"
  log "restarting $SERVICE_NAME"
  systemctl restart "$SERVICE_NAME"
fi

log "update complete"
