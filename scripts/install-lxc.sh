#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[landing-page:install] %s\n' "$*"
}

fail() {
  printf '[landing-page:install] ERROR: %s\n' "$*" >&2
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

REPO_URL="${REPO_URL:-https://github.com/seanbrown-com/landing-page.git}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-/opt/landing-page}"
SERVICE_NAME="${SERVICE_NAME:-landing-page}"
PORT="${PORT:-8001}"
SERVICE_USER="${SERVICE_USER:-www-data}"

if [[ -z "$PORT" || ! "$PORT" =~ ^[0-9]+$ ]]; then
  fail "PORT must be a number"
fi

if ! command -v systemctl >/dev/null 2>&1; then
  fail "systemd is required for this installer"
fi

if command -v apt-get >/dev/null 2>&1; then
  log "installing required packages"
  run_as_root apt-get update
  run_as_root apt-get install -y git python3 ca-certificates
else
  command -v git >/dev/null 2>&1 || fail "git is required"
  command -v python3 >/dev/null 2>&1 || fail "python3 is required"
fi

if [[ -d "$INSTALL_DIR/.git" ]]; then
  log "repo already exists at $INSTALL_DIR; updating it"
  run_as_root git -C "$INSTALL_DIR" fetch --prune origin
  run_as_root git -C "$INSTALL_DIR" checkout "$BRANCH"
  run_as_root git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
else
  if [[ -e "$INSTALL_DIR" ]]; then
    fail "$INSTALL_DIR exists but is not a git checkout"
  fi

  log "cloning $REPO_URL into $INSTALL_DIR"
  run_as_root git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

for required_file in index.html styles.css app.js assets/home-apps.svg; do
  [[ -f "$INSTALL_DIR/$required_file" ]] || fail "missing required file: $INSTALL_DIR/$required_file"
done

run_as_root chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"

service_path="/etc/systemd/system/${SERVICE_NAME}.service"
tmp_service="$(mktemp)"
cat > "$tmp_service" <<SERVICE
[Unit]
Description=Home Network Landing Page
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/python3 -m http.server $PORT --bind 0.0.0.0
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

log "installing systemd service $SERVICE_NAME"
run_as_root install -m 0644 "$tmp_service" "$service_path"
rm -f "$tmp_service"

run_as_root systemctl daemon-reload
run_as_root systemctl enable --now "$SERVICE_NAME"

log "service status"
run_as_root systemctl --no-pager --full status "$SERVICE_NAME" || true

log "install complete"
log "open http://<lxc-ip>:$PORT"
log "future updates: cd $INSTALL_DIR && SERVICE_NAME=$SERVICE_NAME ./scripts/update-from-git.sh"
