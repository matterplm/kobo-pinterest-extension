# Kōbō Inspiration — browser extension

Pin images, screenshots and page captures from anywhere on the web straight into
your Kōbō inspiration boards, with the board, collection, tags and style/component
links set at save time.

## What it does

**Capture**
- Hover any image over 140 px and a **Save to Kōbō** button appears.
- Right-click → *Pin image to Kōbō*, *Pin selection to Kōbō*, *Pin this page to Kōbō*.
- Drag-select any region of a page (`Ctrl/Cmd+Shift+E`) and pin the crop.
- Screenshot the whole visible page (`Ctrl/Cmd+Shift+Y`).

**Save sheet** — the in-page dialog that opens on capture:
- Board picker, with inline board creation.
- Collection picker for the chosen board.
- Title (required) and notes, pre-filled from the image's alt text and the page title.
- Tags, optionally pre-filled from the page's own keyword metadata.
- Link the pin to one or more **styles** or **components** by search.
- Optional colour-palette extraction.

**Popup**
- Sign in, and a live count of saves today / total pins / boards.
- Your boards, click through to open one in Kōbō.
- Brand switcher for multi-brand accounts — pins land in the brand you pick here.
- Quick actions for page screenshot and area capture.

**Settings** (`options/`)
- Default board, and an optional one-click save that skips the sheet entirely.
- Toggle the hover button and tag suggestions.
- Switch between Production / Staging / Local API targets.
- Read-only view of the current keyboard shortcuts.

## Distribution

Not yet published. There is no Chrome Web Store listing and no extension ID,
so today the only way to run it is load-unpacked. **`PUBLISHING.md` is the
runbook** for getting it listed — store copy, permission justifications and
data disclosures are all written; what remains needs a Google account.

Note there is also nothing in the Kōbō app pointing users at the extension.
Publishing and being discoverable are separate jobs; see the end of
`PUBLISHING.md`.

## Install (development)

There is **no build step** — Chrome loads the source directly.

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this directory.
3. Click the Kōbō icon and sign in with your Kōbō credentials.

Before packaging or after any edit:

```bash
npm run check      # manifest refs, JS syntax, hardcoded hosts, shadow-DOM classes
npm run package    # runs the checks, then zips for the Web Store
```

The staging and local environment options in Settings appear **only in an
unpacked install** (`chrome.management.getSelf().installType`). A Web Store
build is pinned to production, so a customer can't strand themselves on a
server that isn't there.

## Architecture

```
manifest.json            MV3 manifest — module service worker
lib/config.js            environments + persisted settings. The ONLY place hosts live.
lib/api.js               every Kōbō endpoint the extension uses
lib/session.js           token storage, brand switching, saved-today counter
lib/tokens.css           app design tokens, mirrored from the client's _design-tokens.scss
background/              service worker: auth, context menus, commands, all network I/O
content/styles.js        shadow-root stylesheet (a string — manifest CSS can't reach a shadow tree)
content/content-script.js hover button, save sheet, area capture, toasts
popup/                   sign-in and dashboard
options/                 settings page
scripts/check.mjs        pre-package gate
```

Two rules the code depends on:

- **All network I/O happens in the service worker.** Fetches from an MV3 worker
  are exempt from CORS under `host_permissions`; the same fetch from a content
  script would be blocked, because `config/cors.php` does not allow
  `chrome-extension://` origins.
- **All in-page UI lives in one shadow root.** Host-page CSS cannot reach it and
  ours cannot leak out. v1 wrapped every `<img>` in a positioned `div`, which
  broke layout on grid and `object-fit` sites.

## Server contract

Endpoints are defined in `server/routes/api/inspiration.php` and implemented in
`InspirationController`. Things worth knowing before changing the client:

| Behaviour | Detail |
|---|---|
| Auth | `POST /api/login` with `app_type: chrome_extension`. That value must stay registered in `config/session-management.php` `valid_app_types`, or login returns 400. |
| Tenant context | Every authenticated request sends `X-Tenant-Company` / `X-Tenant-Brand` (plus the legacy `X-Company-ID` / `X-Brand-ID`), mirroring `client/plugins/axios.ts`. Without them the server falls back to the user's `selected_brand_id` setting — i.e. whichever brand they last picked in the web app. |
| Pin creation | `POST /inspiration/pins` needs `board_id` and `title`; image comes from either `image_url` or a multipart `image` (captures use the latter). |
| Linking | `POST /inspiration/pins/{id}/link` accepts `linkable_type` of **`style` or `component` only** — not suppliers. One link per call. |
| Boards | `GET /inspiration/boards` is scoped to `user_id`, so it returns only boards you own, not team boards you collaborate on. |
| Legacy | `POST /inspiration/save-pin` still exists for v1 installs. It ignores board choice and dumps everything into an auto-created "Pinterest Saves" board. The current extension does not use it. |

## Known gaps

- Board list shows only boards you own (a server-side scope, not a client issue).
- Pins cannot be linked to suppliers — the server restricts `linkable_type` to
  style and component.
- Text-only pins are saved as a page screenshot with the selection as the note;
  the server has no first-class text pin type on this route.
- No automated tests. `npm run check` is a syntax and wiring gate, not a test suite.
