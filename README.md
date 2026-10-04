# Common Ground: Community Histories of the Campus Precinct, 1850s–1950s

**Live site:** https://notamitchell.github.io/order/

> ### Looking to explore or contribute? You probably want the website, not this page.
>
> This page is the technical documentation for the people who build and maintain the site.
>
> - **Read about the project:** [About Common Ground](https://notamitchell.github.io/order/)
> - **Browse the histories:** [Featured pages A–Z](https://notamitchell.github.io/order/aToZ) · [Map](https://notamitchell.github.io/order/map) · [People](https://notamitchell.github.io/order/people) · [Places](https://notamitchell.github.io/order/places)
> - **Share a story or add to an entry:** open any entry on the site and use the *Contribute* form at the bottom, or [start a new entry](https://notamitchell.github.io/order/new).
> - **Editorial team reviewing submissions:** go to the [Submission review page](https://notamitchell.github.io/order/admin/review.html) and follow the steps it gives you.
> - **Project partners:** [Melbourne History Workshop](https://melbournehistoryworkshop.com) · [Carlton Community History Group](https://cchg.asn.au)

---

## Contents

- [Overview](#overview)
- [How the site works](#how-the-site-works)
- [Repository layout](#repository-layout)
- [Running the site locally](#running-the-site-locally)
- [Content: encyclopedia entries (EAC-CPF XML)](#content-encyclopedia-entries-eac-cpf-xml)
- [Data: map-data.js](#data-map-datajs)
- [Editorial workflows](#editorial-workflows)
- [Adding a new page or facet](#adding-a-new-page-or-facet)
- [External services and dependencies](#external-services-and-dependencies)
- [Known issues and gotchas](#known-issues-and-gotchas)
- [Roadmap](#roadmap)
- [Licence](#licence)
- [Credits and acknowledgements](#credits-and-acknowledgements)

---

## Overview

Common Ground is a static website hosted on **GitHub Pages** and built with **Jekyll**, using the `jekyll-theme-cayman` theme with a custom layout. It has no server or database of its own:

- **Encyclopedia entries** are [EAC-CPF](https://eac.staatsbibliothek-berlin.de/) XML files in `civic/`. The browser fetches them and renders them on the fly.
- **Historical directory data** (Sands & McDougall directories and electoral rolls) is one large JavaScript file, `map-data.js`. The search panel, the maps and the People/Places lists all read from it.
- **Public contributions** go through a Google Apps Script web app, which opens a pull request on this repository. The editorial team then merges the pull request (accept) or closes it (reject).

Nothing is published until a pull request is merged into `main`. GitHub Pages rebuilds the site automatically after each merge, usually within a minute or two.

## How the site works

```
                 ┌──────────────────────────── GitHub Pages (Jekyll) ───────────────────────────┐
 Visitor ──────▶ │  index / aToZ / people / places / map / map3d / civic?id=…                     │
                 │        │                                   │                                  │
                 │        ▼                                   ▼                                  │
                 │   map-data.js (directoryData)        civic/<slug>.xml  (fetched + parsed     │
                 │   UoM_Landuse_2026.js (map only)      in the browser by _layouts/entry.html) │
                 └──────────────────────────────────────────────────────────────────────────────┘

 Contributor ──▶ form (_layouts/form.html, Quill editor)
                   │  POST JSON {authorName, articleTitle, prefilledId, articleText}
                   ▼
                 Google Apps Script web app ──▶ new branch + civic/<slug>.xml + pull request
                                                         │
 Editor ───────▶ admin/review.html ── lists open PRs touching civic/, previews them ──┐
                                                         │                            │
                                                         ▼                            ▼
                                            Merge on GitHub (accept)   Close on GitHub (reject)
```

### Entry pages

`civic.md` uses `_layouts/entry.html`. A URL such as `civic?id=Corkman Hotel`:

1. turns the `id` into a filename slug (`Corkman-Hotel`);
2. fetches `civic/Corkman-Hotel.xml`;
3. parses the EAC-CPF XML (namespace `urn:isbn:1-931666-33-4`) and renders it;
4. adds the contribution form underneath. If no file exists yet, the form takes the entry's place so the community can create it.

With `preview=true`, `id` can be a full URL, such as a raw file on a pull-request branch. This is how `admin/review.html` previews submissions before they are merged.

### Search, facets and maps

- **Search panel** (in `_layouts/default.html`): free-text search plus filters for year, street, type and side of street. It searches `directoryData` only. If nothing matches, it offers to start a new entry with that name.
- **People / Places** (`_layouts/facet-list.html`): filter `directoryData` by `source`. `people` shows electoral rolls and `places` shows directories. Results are grouped by source/year → street → side of street.
- **Map** (`_layouts/map.html`): Leaflet 1.9.4. It plots records that have `lat`/`lng`, with University of Melbourne land parcels (`UoM_Landuse_2026.js`) as an overlay.
- **3D Map** (`_layouts/map3d.html`): three.js r128 with OrbitControls. Experimental.

## Repository layout

| Path | What it is |
|---|---|
| `_config.yml` | Jekyll config. Sets the theme and per-page defaults (layout, `EACCPFpath`, `facet`, whether the contribution form shows). |
| `_layouts/default.html` | Site shell: header, navigation and the search panel. **Loads `map-data.js` on every page.** |
| `_layouts/entry.html` | Fetches and renders one EAC-CPF entry, and adds the contribution form. |
| `_layouts/form.html` | Rich-text contribution form (Quill 1.3.6) that posts to Google Apps Script. |
| `_layouts/new.html` | "Start a new entry" box that redirects to `civic?id=…`. |
| `_layouts/facet-list.html` | People / Places listings. |
| `_layouts/map.html`, `_layouts/map3d.html` | 2D Leaflet map and 3D three.js map. |
| `*.md` (root) | One small file per page. Mostly front matter that picks a layout. `aToZ.md` is the hand-maintained index of featured pages. |
| `civic/*.xml` | Published encyclopedia entries (EAC-CPF). |
| `map-data.js` | All directory and electoral-roll records, as `const directoryData = [...]` (~2.6 MB, ~9,200 records). |
| `UoM_Landuse_2026.js` | GeoJSON of University of Melbourne land parcels, as `const uomLanduseData = {...}`. |
| `admin/review.html` | Plain-language review page for the editorial team. |
| `admin/carlton-data-editor.html` | Browser-based editor for `map-data.js`. |
| `scripts/banner-parallax.js` | Header banner effect. |
| `styles/site.css` | Site styles. |
| `images/` | Static images. |

## Running the site locally

You need Ruby (3.x) and Bundler. The repo has no `Gemfile` yet, so create one locally (please don't commit it until we agree to; see the roadmap):

```ruby
# Gemfile
source "https://rubygems.org"
gem "github-pages", group: :jekyll_plugins
gem "webrick"
```

Then:

```bash
bundle install
bundle exec jekyll serve
# open http://127.0.0.1:4000/
```

Notes:

- Internal links leave out `.html` (e.g. `civic?id=…`). GitHub Pages handles this, and `jekyll serve` normally does too. If a link 404s locally, try adding `.html`.
- `admin/review.html` reads from the live GitHub repo. `admin/carlton-data-editor.html` first tries to load the **live** `map-data.js` from GitHub Pages, so both show live data even when run locally.
- Submitting the contribution form locally **creates a real pull request** through the live Apps Script. Close any test pull requests afterwards.

## Content: encyclopedia entries (EAC-CPF XML)

Entries follow the EAC-CPF schema (`urn:isbn:1-931666-33-4`). For a full example, see `civic/Corkman-Hotel.xml` or `civic/Larrikins-and-Pushes.xml`.

**Current conventions.** These are still settling as the project goes. Please update this section when a decision is made.

- **Filename = slug of the entry ID**: spaces become `-`, anything other than letters, digits, `_` and `-` is removed, and the file goes in `civic/`, e.g. `Mary Mather (Pelham Hotel)` → `civic/Mary-Mather-Pelham-Hotel.xml`. The slug logic is `slugifyId()` in `_layouts/entry.html`. A file that doesn't match the slug won't be found.
- `<recordId>` and `<entityId>` match the filename (without `.xml`).
- `<maintenanceHistory>` records who contributed and when. The Apps Script sets this for public contributions.
- `<entityType>`: every entry so far uses `concept`, including people and hotels. *TBD: decide whether to use EAC-CPF's `person` / `corporateBody` / `family`.*
- To add an entry to the A–Z, add a link in `aToZ.md` by hand.

Open questions to settle: controlled vocabulary for `entityType` and `localType`, how to cite sources inside entries, how to handle images, how to link entries to `directoryData` records, and what to do with entries that have two names (e.g. *Carlton Inn* / *Corkman Hotel*).

## Data: map-data.js

`map-data.js` declares one global array, `directoryData`, which every page uses. The data comes from public-domain sources: the **Sands & McDougall Directories of Victoria** and **Victorian electoral rolls**.

| Source | Years | Records |
|---|---|---|
| Directory (Sands & McDougall) | 1900, 1905, 1910, 1915, 1920, 1925, 1930 | ~7,700 |
| Electoral roll | 1919, 1928 | ~1,500 |

Typical record:

```json
{
  "entityID": 2,
  "source": "Directory",
  "year": 1900,
  "pages": "172",
  "listing": "Intersection Barry street and Leicester street",
  "street": "Barry Street",
  "type": "Intersection",
  "cardinality": "East",
  "lat": -37.8037,
  "lng": 144.9604
}
```

| Field | Notes |
|---|---|
| `entityID` | Usually a number. A **string** (e.g. `"Bridget O'Neill"`) links the same person or place across years. Many records share a string ID on purpose; the search panel uses these to trace someone through time. |
| `source` | `"Directory"` or `"Electoral roll"`. This decides whether a record appears under People or Places. |
| `year`, `pages`, `listing`, `street`, `type`, `cardinality` | As transcribed. `cardinality` is the side of the street (North/South/East/West). |
| `lat`, `lng` | Optional. Only about 1,450 records are geocoded so far, and only these appear on the map. |
| `Surname`, `Given Names`, `Registration Number`, `Address`, `Street Number`, `Gender`, `Occupation`, `Notes` | Electoral-roll fields (Title Case, some with spaces). Some later directory records also have `Occupation` / `Notes`. |

### Editing the data

Use `admin/carlton-data-editor.html`. It loads the live file, lets you search and edit records, and then downloads a new `map-data.js`. Someone then has to upload that file to GitHub by hand (the editor explains how). Check the downloaded filename is exactly `map-data.js` (browsers sometimes save `map-data (1).js`), and make sure you started from the latest version so you don't overwrite someone else's changes.

## Editorial workflows

### Reviewing a public submission (editorial team)

1. Open **`admin/review.html`**. It lists open pull requests that add or change files in `civic/`.
2. Pick a submission to see a live preview of the entry as it would appear on the site.
3. Sign in to GitHub, then follow the link to the pull request:
   - **Accept:** *Merge pull request* → *Confirm merge*.
   - **Reject:** *Close pull request*. Ideally leave a short comment saying why.
   - **Needs changes:** edit the XML file on the pull request branch on GitHub, then merge.
4. The site updates a minute or two after merging.

The review page walks reviewers through these steps in plain language. If you change the workflow, update both that page and this section.

### Updating directory/map data

See [Editing the data](#editing-the-data) above. This is separate from entry submissions and needs more care, because a broken `map-data.js` breaks search, the maps and the People/Places pages on every page of the site.

## Adding a new page or facet

- **Simple page:** add `my-page.md` at the root with front matter (`title`, optionally `layout`). It gets `layout: default` automatically.
- **New facet list** (like People/Places): add `my-facet.md`, add a `scope` block in `_config.yml` with `layout: facet-list` and `facet: "my-facet"`, and add a matching branch to the `filter` in `_layouts/facet-list.html`.
- **New entry collection** (another folder like `civic/`): add a page using `layout: entry` and set `EACCPFpath` to the folder name in `_config.yml`.
- **Navigation:** edit the `<nav>` list in `_layouts/default.html`.

## External services and dependencies

| Service / library | Used by | Notes |
|---|---|---|
| GitHub Pages | Hosting | Builds from `main`. |
| Google Apps Script web app | `_layouts/form.html` (`SCRIPT_URL`) | Turns form submissions into branches and pull requests. **The script's source and its GitHub credentials are not in this repo.** Owner and location: *TBD, please document*. |
| GitHub REST API (no sign-in) | `admin/review.html` | Limited to 60 requests/hour per visitor IP address. Each listed pull request uses a request. |
| Quill 1.3.6 | Contribution form | cdn.quilljs.com |
| Leaflet 1.9.4 | 2D map | cdnjs |
| three.js r128 + OrbitControls | 3D map | cdnjs / jsDelivr |
| Google Fonts | Site typography | Libre Caslon Text, Courier Prime |
| UoM Land Parcels (Parkville) | Map overlay | [University of Melbourne open spatial data](https://spatialdata-uom.opendata.arcgis.com/datasets/UOM::uom-land-parcels-parkville/about) |

## Known issues and gotchas

- **Every page downloads ~2.6 MB of data** because `default.html` loads `map-data.js` for the search panel. This hurts load times on mobile. See the roadmap.
- **`map-data.js` is JavaScript, not JSON.** Other tools can't read it directly, a stray comma breaks the whole site, and diffs are huge and hard to review.
- **Field names are inconsistent** (`year` vs `Given Names` vs `Occupation`), and `entityID` mixes numbers and strings.
- **The A–Z is maintained by hand** and links to many entries that don't exist yet. Those links open the "contribute" form, which is intended, but it isn't obvious.
- **Review page rate limit:** with many open pull requests, or several editors on the same network, `admin/review.html` can hit GitHub's anonymous API limit and show an error. Waiting an hour fixes it.
- **No automated checks.** Malformed XML or a broken `map-data.js` can be merged without anyone noticing.

---

## Roadmap

This is a living plan, so reorder it as priorities and funding change. Items are grouped by theme and roughly ordered within each group, cheapest and most valuable first. **Bold** items are suggested next steps.

### 1. Data structure (map-data.js → JSON, split by year)

Goal: smaller downloads, readable diffs, safer edits, and data other tools can reuse.

- [ ] **Agree on a data schema**: consistent `camelCase` field names (`givenNames`, `surname`, `occupation`, …), a clear rule for `entityID` (numeric record ID plus a separate `personId`/`placeId` for linking across years), and which fields are required. Write it up in `data/SCHEMA.md`.
- [ ] **One-off conversion script** that reads `map-data.js` and writes:
  - `data/directory/1900.json`, `data/directory/1905.json`, … `data/electoral-roll/1919.json`, …
  - `data/index.json`: a manifest listing each file with its source, year, record count and field list.
- [ ] Small shared loader (`scripts/data.js`) with `loadYears([...])` / `loadAll()`, which `fetch()`es only the JSON files it needs and caches them.
- [ ] Switch pages over one at a time: maps and People/Places first, then the search panel. After that, stop loading `map-data.js` on every page.
- [ ] Convert `UoM_Landuse_2026.js` to `data/uom-land-parcels.geojson` in the same way.
- [ ] Remove `map-data.js` once nothing uses it.

### 2. Better search

- [ ] **Build a search index of entries and directory data together**, so one search box finds both "Corkman Hotel" (the entry) and every directory listing for it. Options: [Pagefind](https://pagefind.app/) (static, runs at build time, would need a GitHub Action) or [MiniSearch](https://github.com/lucaong/minisearch) / [Lunr](https://lunrjs.com/) indexes built in the browser or ahead of time.
- [ ] **Fuzzy matching for historical spellings** (Berkley/Berkeley, Leister/Leicester, Mrs/Mrs.), with a small list of known variants.
- [ ] Search results grouped by type (Entries / People / Places), with snippets and highlighted matches.
- [ ] "Trace this person/place across years" as a timeline view, built on the shared IDs that already exist.
- [ ] Shareable search URLs (`?q=…&year=…&street=…`).
- [ ] Load the search index only when the search panel is opened.

### 3. Editorial tools (towards a proper GUI for a non-technical team)

Goal: editors never need to touch GitHub directly. Done in small, fundable steps, with each step useful on its own.

- [ ] **Data editor saves by pull request**: replace "download, then upload to GitHub by hand" with a *Submit changes* button that sends the edited records to the Apps Script (the same pattern the contribution form already uses), which opens a pull request. This removes the riskiest manual step. It's easier once the data is split into per-year JSON (smaller pull requests, easier to review).
- [ ] **Data-change preview on the review page**: show a readable table of changed records (before → after) instead of a raw diff.
- [ ] **Accept/Reject buttons on the review page**, done either through the Apps Script (editors don't need a GitHub account) or through GitHub sign-in. Include a "reason for rejection" box that is posted as a comment for the record.
- [ ] Edit a submission's text in the review page before accepting it.
- [ ] Consider an off-the-shelf git-based CMS such as [Decap CMS](https://decapcms.org/) or [Sveltia CMS](https://github.com/sveltia/sveltia-cms) for editing entries. Both run on GitHub Pages without a server, but may need a small auth proxy. Compare the cost against continuing with the custom tools.
- [ ] Bring the Apps Script source into this repo (e.g. `apps-script/`) with [clasp](https://github.com/google/clasp), so it is version-controlled and documented.

### 4. Quality and safety nets

- [ ] **GitHub Action that runs on every pull request**: check that XML is well-formed (and ideally valid EAC-CPF), check that data JSON is valid against the schema, and check that the entry filename matches the `recordId`. Editors would then see a green tick or red cross on each submission.
- [ ] Commit a `Gemfile` so local builds match GitHub Pages.
- [ ] Contributor guide (`CONTRIBUTING.md`) setting out entry conventions as they're agreed.
- [ ] Generate the A–Z automatically from `civic/` (plus a "wanted entries" list) instead of maintaining `aToZ.md` by hand.

### 5. Maps

- [ ] Geocode more records. Only about 16% have coordinates. A simple "place this record on the map" tool in the data editor would help volunteers do it.
- [ ] Year slider/filter on the 2D map to show the precinct changing from 1900 to 1930.
- [ ] Link map markers to entries and entries to map locations.
- [ ] Historical base map overlays (e.g. MMBW plans), if suitable public-domain scans are available.
- [ ] Decide on the future of the 3D map: polish it or retire it.

### 6. Site and content

- [ ] Remove the "under construction" notice once the core is stable.
- [ ] Accessibility pass (keyboard navigation for search and maps, colour contrast, alt text).
- [ ] Add an About page, Acknowledgement of Country, credits and licence to the site.
- [ ] Cite sources consistently on entry pages, with a "how to cite this page" box.
- [ ] Support images in entries.

---

## Licence

*Proposed. Confirm before publishing.*

- **Written content** (`civic/` entries and site text) is licensed under [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/), unless a page says otherwise.
- **Historical source data** (Sands & McDougall directories, electoral rolls) is in the public domain. The transcription and geocoding in `map-data.js` are *TBD: same CC BY-NC 4.0, or CC0?*
- **University of Melbourne land parcel data** is used under the terms of the [UoM open data portal](https://spatialdata-uom.opendata.arcgis.com/datasets/UOM::uom-land-parcels-parkville/about).
- **Source code** (layouts, scripts, styles): *TBD.* Creative Commons does not recommend its licences for software, so consider MIT or similar for the code.

## Credits and acknowledgements

*To be completed.*

- **Acknowledgement of Country:** *TBD*
- **Project partners:** Melbourne History Workshop, Carlton Community History Group
- **Funding:** *TBD*
- **Project team and contributors:** *TBD*
- **Contact:** *TBD*
