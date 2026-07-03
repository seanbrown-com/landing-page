# Home Network Landing Page

A small static landing page for home-network services. It starts blank, then lets a browser user set a page title, upload a page icon, upload a banner image, create titled sections, and add service tiles with a title, URL, and resized icon image.

## Features

- Edit mode for title, page icon, banner, section creation, section ordering, tile creation, tile deletion, and tile ordering.
- Tiles can be moved from one section to another.
- Uploaded page, banner, and tile images are resized in the browser before storage.
- When served by `server.py`, page data is saved on the server in `data/state.json`, so phones and desktops see the same landing page.
- Direct file/static-server usage falls back to `localStorage`.
- No build step or server dependency.

## Run

For shared state across devices:

```sh
python3 server.py --port 8001 --host 0.0.0.0
```

For a quick local-only preview, open `index.html` directly in a browser.

## Update On LXC

For a first-time install on a Debian/Ubuntu LXC:

```sh
curl -fsSL https://raw.githubusercontent.com/seanbrown-com/landing-page/main/scripts/install-lxc.sh | bash
```

Defaults:

- Installs to `/opt/landing-page`
- Creates `landing-page.service`
- Serves on port `8001`
- Runs as `www-data`
- Stores shared state in `/opt/landing-page/data/state.json`

Override defaults like this:

```sh
PORT=8001 INSTALL_DIR=/opt/landing-page SERVICE_NAME=landing-page bash scripts/install-lxc.sh
```

From the checked-out repo on the LXC:

```sh
./scripts/update-from-git.sh
```

If the service needs a restart after pulling:

```sh
SERVICE_NAME=landing-page ./scripts/update-from-git.sh
```

If your web server serves from a separate directory:

```sh
DEPLOY_DIR=/var/www/landing-page SERVICE_NAME=landing-page ./scripts/update-from-git.sh
```
