#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[landing-page:update] %s\n' "$*"
}

fail() {
  printf '[landing-page:update] ERROR: %s\n' "$*" >&2
  exit 1
}

run_as_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    fail "this step requires root; rerun as root or install sudo"
  fi
}

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd -- "$SCRIPT_DIR/.." && pwd)}"
REPO_URL="${REPO_URL:-https://github.com/seanbrown-com/landing-page.git}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-}"
DEPLOY_DIR="${DEPLOY_DIR:-}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"
PORT="${PORT:-8001}"
SERVICE_USER="${SERVICE_USER:-www-data}"

ensure_git_checkout() {
  if git -C "$APP_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    return
  fi

  log "$APP_DIR is not a git checkout; adopting existing install"
  parent_dir="$(dirname -- "$APP_DIR")"
  app_name="$(basename -- "$APP_DIR")"
  backup_dir="${APP_DIR}.backup.$(date +%Y%m%d%H%M%S)"
  tmp_dir="$(mktemp -d "${parent_dir}/${app_name}.clone.XXXXXX")"

  git clone --branch "$BRANCH" "$REPO_URL" "$tmp_dir"

  if [[ -d "$APP_DIR/data" ]]; then
    log "preserving existing data directory"
    cp -a "$APP_DIR/data" "$tmp_dir/data"
  fi

  mv "$APP_DIR" "$backup_dir"
  mv "$tmp_dir" "$APP_DIR"
  log "old install moved to $backup_dir"
}

ensure_git_checkout
cd "$APP_DIR"

if [[ "$ALLOW_DIRTY" != "1" ]] && [[ -n "$(git status --porcelain)" ]]; then
  fail "working tree has local changes; commit/stash them or rerun with ALLOW_DIRTY=1"
fi

current_branch="$(git branch --show-current)"
[[ -n "$current_branch" ]] || fail "checkout is detached; check out a branch before updating"

log "updating $APP_DIR on branch $current_branch"
git fetch --prune origin
git pull --ff-only

for required_file in index.html styles.css app.js server.py assets/home-apps.svg; do
  [[ -f "$required_file" ]] || fail "missing required file after update: $required_file"
done

if [[ -n "$DEPLOY_DIR" ]]; then
  log "copying static files to $DEPLOY_DIR"
  install -d "$DEPLOY_DIR/assets"
  cp index.html styles.css app.js server.py "$DEPLOY_DIR/"
  cp assets/home-apps.svg "$DEPLOY_DIR/assets/"
fi

if [[ -n "$SERVICE_NAME" ]]; then
  command -v systemctl >/dev/null 2>&1 || fail "systemctl is not available; cannot restart $SERVICE_NAME"
  serve_dir="${DEPLOY_DIR:-$APP_DIR}"
  service_path="/etc/systemd/system/${SERVICE_NAME}.service"
  tmp_service="$(mktemp)"

  log "ensuring shared data directory is writable by $SERVICE_USER"
  run_as_root install -d -o "$SERVICE_USER" -g "$SERVICE_USER" "$serve_dir/data"
  run_as_root chown -R "$SERVICE_USER:$SERVICE_USER" "$serve_dir/data"

  cat > "$tmp_service" <<SERVICE
[Unit]
Description=Home Network Landing Page
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$serve_dir
ExecStart=/usr/bin/python3 server.py --port $PORT --host 0.0.0.0
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

  log "updating systemd service $SERVICE_NAME"
  run_as_root install -m 0644 "$tmp_service" "$service_path"
  rm -f "$tmp_service"
  run_as_root systemctl daemon-reload
  log "restarting $SERVICE_NAME"
  run_as_root systemctl restart "$SERVICE_NAME"
fi

log "update complete"
