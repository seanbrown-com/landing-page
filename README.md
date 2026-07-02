# Home Network Landing Page

A small static landing page for home-network services. It starts blank, then lets a browser user set a page title, upload a page icon, upload a banner image, create titled sections, and add service tiles with a title, URL, and resized icon image.

## Features

- Edit mode for title, page icon, banner, section creation, section ordering, tile creation, tile deletion, and tile ordering.
- Tiles can be moved from one section to another.
- Uploaded page, banner, and tile images are resized in the browser before storage.
- Tile data is saved to `localStorage`, so the page survives refreshes on the same browser.
- No build step or server dependency.

## Run

Open `index.html` directly in a browser, or serve the folder with any static server.

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
