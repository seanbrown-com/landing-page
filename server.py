#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
STATE_FILE = DATA_DIR / "state.json"
MAX_BODY_BYTES = 25 * 1024 * 1024


class LandingPageHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] == "/api/state":
            self.send_state()
            return

        super().do_GET()

    def do_PUT(self) -> None:
        self.save_state()

    def do_POST(self) -> None:
        self.save_state()

    def send_state(self) -> None:
        if STATE_FILE.exists():
            body = STATE_FILE.read_bytes()
        else:
            body = b'{"title":"Home Services","icon":"","banner":"","sections":[]}'

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def save_state(self) -> None:
        content_length = int(self.headers.get("Content-Length", "0"))

        if content_length > MAX_BODY_BYTES:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "state payload is too large")
            return

        body = self.rfile.read(content_length)

        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "state payload must be JSON")
            return

        try:
            DATA_DIR.mkdir(exist_ok=True)
            tmp_file = STATE_FILE.with_suffix(".json.tmp")
            tmp_file.write_text(json.dumps(parsed, separators=(",", ":")), encoding="utf-8")
            tmp_file.replace(STATE_FILE)
        except OSError as error:
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, f"could not save state: {error}")
            return

        response = b'{"ok":true}'
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the home network landing page.")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", default=8001, type=int)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), LandingPageHandler)
    print(f"Serving landing page on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
