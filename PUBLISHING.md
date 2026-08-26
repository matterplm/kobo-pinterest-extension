# Publishing to the Chrome Web Store

## Published listing

| | |
|---|---|
| Extension ID | `fjhfgodiilcekkabhbbfbfoccofhcnej` |
| Install URL | https://chromewebstore.google.com/detail/fjhfgodiilcekkabhbbfbfoccofhcnej |
| Owner account | `subscriptions@kobolabs.io` |
| First submitted | 2026-08-26, v2.0.0 |

The ID is permanent — it is derived from the signing key Google generated on
first upload and cannot change. Every install link embeds it, so treat it as a
stable identifier you can hard-code.

The extension has never been distributed. There is no listing, no extension ID,
and nothing in the Kōbō app that points a user at it. This is the path from
here to installed-from-a-link.

Everything a machine can do is done: `npm run package` produces the upload
artefact. The rest needs a Google account, so it needs you.

---

## Before you submit

**1. Click through it once against production.** It has been verified endpoint
by endpoint with curl, and the save sheet has been seen rendering, but no one
has completed a full pin → board round trip in a browser. Do that first — a
rejected or buggy first listing is expensive because the review queue is days,
not minutes.

**2. Decide listing visibility.**

| | Who can install | Use when |
|---|---|---|
| **Unlisted** | Anyone with the direct link, not searchable | First release, pilot brands. **Recommended.** |
| **Public** | Anyone, appears in search | Once it has real usage behind it |
| **Private** | Only members of a Google Workspace domain | Doesn't fit — customers aren't on our domain |

Start unlisted. Going unlisted → public later is a settings toggle; going the
other way after people have installed is not.

**3. The extension ID is permanent.** It is derived from the signing key Google
generates on first upload. The listing name and icon can change afterwards; the
ID cannot, and every install URL embeds it. Be happy with the package before
the first upload.

---

## Submission

1. **Developer account** — https://chrome.google.com/webstore/devconsole
   One-off $5 registration fee. Use an account that outlives any individual:
   a shared Kōbō Google account, not a personal one. Transferring a listing
   between accounts later is a support ticket, not a button.

2. **Build the artefact**

   ```bash
   cd kobo-pinterest-extension
   npm run package        # runs the checks, then zips
   ```

   Produces `kobo-inspiration-extension.zip` (~50 KB). The zip deliberately
   excludes `README.md`, `PUBLISHING.md`, `scripts/` and `.git` — only the 25
   files Chrome actually loads.

3. **New item → upload the zip.**

4. **Fill the listing** using the copy below.

5. **Complete the privacy tab** using the disclosures below. This is where most
   first submissions fail — the permission justifications are mandatory free
   text and a thin answer gets a rejection.

6. **Submit.** Review is typically 1–3 business days; anything requesting
   `<all_urls>` can take longer.

---

## Store listing copy

**Name** (45 char max)

```
Kōbō Inspiration
```

**Short description** (132 char max)

```
Pin images, screenshots and colour from anywhere on the web straight into your Kōbō inspiration boards.
```

**Category:** Workflow & Planning
**Language:** English (UK)

**Detailed description**

```
Kōbō Inspiration turns any page on the web into design research that lands
where your team already works.

Hover any image and save it to a Kōbō inspiration board without leaving the
page. Choose the board and collection, add a title, notes and tags, link the
pin to the style or component it relates to, and pull the dominant colour
palette off the image — all before it saves.

CAPTURE
• Hover any image for a one-click save
• Right-click to pin an image, a text selection, or the whole page
• Drag-select any region of a page to capture a crop
• Screenshot the visible page
• Keyboard shortcuts for capture and save

ORGANISE AS YOU SAVE
• Pick the board and collection at save time
• Create a new board without leaving the page
• Title and notes, pre-filled from the page
• Tags, with suggestions from the page's own metadata
• Link a pin directly to a style or component in Kōbō
• Optional colour-palette extraction

BUILT FOR MULTI-BRAND TEAMS
• Switch which brand you are pinning into
• Pins land in the same inspiration boards as the Kōbō web app
• See what you have saved today without opening Kōbō

Requires a Kōbō account. Kōbō is a product lifecycle management platform for
fashion and apparel brands — https://kobolabs.io
```

**Support URL:** `https://kobolabs.io`
**Privacy policy URL:** `https://kobolabs.io/privacy-policy` (verified live)

---

## Screenshots

Five slots, 1280×800 PNG. Capture at 1280×800 exactly — Chrome upscales other
sizes and it looks cheap. Suggested set, in order:

1. The save sheet open over a real product or editorial page, board picker
   showing a populated board list
2. The board picker dropdown open, mid-search
3. The "Link to" field with style results showing
4. The hover "Save to Kōbō" button on an image
5. The popup, signed in, with boards and today's count

Use a seeded demo brand, not a customer's real data. Check no other customer's
name appears in the board list.

---

## Permission justifications

Copy these into the console verbatim. Each permission needs its own.

**`host_permissions: <all_urls>`** — the one that draws scrutiny:

```
Kōbō Inspiration lets a designer save any image they find on the web into
their Kōbō inspiration board. Design research happens across an unpredictable
range of sites — retailer product pages, editorial titles, Pinterest, supplier
catalogues, trade publications — so the set of sites cannot be enumerated in
advance, which is why a narrower host list is not workable for this feature.

Host access is used for exactly two things: rendering the save dialog on the
page the user is viewing, and reading the URL of the specific image they have
chosen to save.

The extension transmits nothing while the user is simply browsing. Only when
they explicitly click to save an image does it send that image's URL, the page
URL, the page title and the image's alt text to the user's own Kōbō account.
If tag suggestions are enabled, it additionally reads the page's own keywords
meta tag. No page content is stored locally, and no browsing history or user
activity is recorded or transmitted.
```

**`storage`**

```
Stores the user's authentication token and their extension preferences (default
board, whether the hover button is shown, tag suggestions) locally. No
preference data leaves the device.
```

**`activeTab`**

```
Used to screenshot the visible tab when the user chooses "Pin this page" or
drag-selects a region to capture. Only invoked in response to an explicit user
action.
```

**`scripting`**

```
Injects the save dialog into a tab that was already open before the extension
was installed or updated. Without it, right-clicking to pin on such a tab
silently does nothing.
```

**`contextMenus`**

```
Adds three right-click items: pin an image, pin a text selection, pin the
current page.
```

**Remote code:** No. The extension executes no remote code — all scripts are in
the package and there is no `eval`, no remote script tags, and a strict CSP.

---

## Data-usage disclosures

Tick and justify:

| Data type | Collected | Why |
|---|---|---|
| Personally identifiable information | Yes | Email address, at sign-in, to authenticate against the user's Kōbō account |
| Authentication information | Yes | Password is sent once to Kōbō's login endpoint; only the returned token is stored |
| Web history | **No** | Only the URL of a page the user explicitly saves a pin from — not browsing history |
| User activity | **No** | No clicks, scrolls or page views are recorded |
| Website content | Yes | The image the user chooses to save, and the page title, at the moment they save |

Then affirm all three certifications: data is not sold, is not used for
unrelated purposes, and is not used for creditworthiness or lending.

---

## After it is approved

1. **Record the extension ID.** It appears in the listing URL:
   `https://chromewebstore.google.com/detail/<name>/<EXTENSION_ID>`

2. **Add the install link to the app.** Mirror the Illustrator plugin, which
   links out to Adobe Exchange from
   `client/pages/account-setting/adobe-illustrator.vue`:

   ```js
   const adobeExchangeUrl = 'https://exchange.adobe.com/apps/cc/204801/kobo-plm-plugin';
   ```

   A `browser-extension.vue` alongside it, linked from account settings, is the
   matching surface. Right now there is nothing in the app that tells a user
   this extension exists, which is the difference between published and
   deployed.

3. **Tell Fin about it.** A help-centre article, or Fin cannot answer "how do I
   save inspiration from the web".

4. **Consider a version gate.** `EnforceIllustratorMinVersion` exists because
   old plugin builds calling the API became a problem. If the extension's API
   contract ever changes, the same middleware pattern applies — the
   `chrome_extension` app_type is already registered and is visible in the
   session analytics, so adoption is measurable from day one.

---

## Releasing an update

```bash
# bump "version" in manifest.json — Chrome requires it to increase
npm run package
# upload the new zip to the existing item, submit for review
```

Updates go through review too, though usually faster. Users receive them
automatically within a few hours of approval.

`.github/workflows/publish-extension.yml` can automate this once you have API
credentials — see the comments in that file. It stays disabled until the
secrets exist, because the first upload has to be manual regardless: the API
can only update an item that already exists.
