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
- **Public contributions** go through a Google Apps Script web app. It saves a copy of each submission to a Google Sheet in the team's shared Google Drive folder, then opens a pull request on this repository. The sheet is a user-friendly backup while the submission process is being settled. The editorial team then merges the pull request (accept) or closes it (reject).

The project is deliberately a **perpetual work in progress**. Gaps in the data and entries that don't exist yet are invitations for the community to contribute, not defects.

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
                 Google Apps Script web app ──▶ 1. copy to Google Sheet (team shared Drive, backup)
                                            ──▶ 2. new branch + civic/<slug>.xml + pull request
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
| `entityID` | Usually a number. A **string** (e.g. `"Bridget O'Neill"`) means someone on the team has decided that several records are the same person or place, and linked them under a new ID they created for that purpose. Many records share a string ID on purpose; the search panel uses these to trace someone through time. |
| `source` | `"Directory"` or `"Electoral roll"`. This decides whether a record appears under People or Places. |
| `year`, `pages`, `listing`, `street`, `type`, `cardinality` | As transcribed. `cardinality` is the side of the street (North/South/East/West). |
| `lat`, `lng` | Optional. About 1,450 records have coordinates so far, and only these appear on the map. Adding more is ongoing community work. |
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
| Google Apps Script web app | `_layouts/form.html` (`SCRIPT_URL`) | Saves a copy of each submission to a Google Sheet in the team's shared Drive folder (backup), then turns it into a branch and pull request. Its source is kept outside this repo. |
| GitHub REST API (no sign-in) | `admin/review.html` | Limited to 60 requests/hour per visitor IP address. See [Known issues](#known-issues-and-gotchas). |
| Quill 1.3.6 | Contribution form | cdn.quilljs.com |
| Leaflet 1.9.4 | 2D map | cdnjs |
| three.js r128 + OrbitControls | 3D map | cdnjs / jsDelivr |
| Google Fonts | Site typography | Libre Caslon Text, Courier Prime |
| UoM Land Parcels (Parkville) | Map overlay | [University of Melbourne open spatial data](https://spatialdata-uom.opendata.arcgis.com/datasets/UOM::uom-land-parcels-parkville/about) |

## Known issues and gotchas

- **Every page downloads ~2.6 MB of data** because `default.html` loads `map-data.js` for the search panel. This hurts load times on mobile, and nothing tells the visitor that data is still loading. See roadmap §1.
- **`map-data.js` is JavaScript, not JSON.** Other tools can't read it directly, a stray comma breaks the whole site, and diffs are huge and hard to review.
- **Field names are inconsistent** (`year` vs `Given Names` vs `Occupation`), and `entityID` mixes numbers and strings (strings are deliberate links made by a person; see the [field reference](#data-map-datajs)).
- **The A–Z is maintained by hand** as Markdown, and links to many entries that don't exist yet. Those links open the "contribute" form, which is intended, but it isn't obvious. See roadmap §3.
- **Review page rate limit (unlikely, but confusing if it happens):** `admin/review.html` calls the GitHub API without signing in, which GitHub caps at 60 requests per hour per IP address. Listing submissions uses one request plus one per open pull request. A small editorial team won't normally reach this, but a large backlog of submissions, or several people on one shared network (e.g. a university or library), could. **Symptoms:** the review page shows an error, an empty list, or submissions that won't load, even though they're visible on GitHub. **Fix:** wait up to an hour, or review directly on GitHub in the meantime.
- **Entries use EAC-CPF loosely.** Every entry is `<entityType>concept</entityType>` (EAC-CPF expects `person`, `corporateBody` or `family`), and most of the schema's structure goes unused. See roadmap §4.
- **No automated checks.** Malformed XML or a broken `map-data.js` can be merged without anyone noticing. See roadmap §5.

---

## Roadmap

This is a living plan, so reorder it as priorities and funding change. Items are grouped by theme and roughly ordered within each group, cheapest and most valuable first. **Bold** items are suggested next steps.

### 1. Data structure and loading (map-data.js → JSON, split by year)

Goal: pages only download the data they need, show visitors what's happening while it loads, and the data becomes easier to edit, review and reuse.

- [ ] **Agree on a data schema**: consistent `camelCase` field names (`givenNames`, `surname`, `occupation`, …), a clear rule for `entityID` (numeric record ID plus a separate `personId`/`placeId` for linking across years), and which fields are required. Write it up in `data/SCHEMA.md`.
- [ ] **One-off conversion script** that reads `map-data.js` and writes:
  - `data/directory/1900.json`, `data/directory/1905.json`, … `data/electoral-roll/1919.json`, …
  - `data/index.json`: a manifest listing each file with its source, year, record count and field list.
- [ ] **Shared data loader** (`scripts/data.js`) that every page uses instead of a global variable:
  - `loadYears([...])` / `loadAll()` fetch only the JSON files a page needs, in parallel.
  - Results are cached in memory and, where the browser allows, between pages, so moving around the site doesn't download the same data again.
  - Loading is **lazy**: e.g. the search panel loads its data when it is first opened, not on every page view.
  - Pages can render the first year or source as soon as it arrives, without waiting for everything.
- [ ] **Loading feedback for visitors**: a consistent "Loading 1905 directory…" indicator or progress bar, disabled filters until their data is ready, and a friendly message with a *Try again* button if a file fails to load (instead of a silently empty page).
- [ ] Switch pages over one at a time: maps and People/Places first, then the search panel. After that, stop loading `map-data.js` on every page.
- [ ] Convert `UoM_Landuse_2026.js` to `data/uom-land-parcels.geojson` in the same way.
- [ ] Remove `map-data.js` once nothing uses it.

### 2. Better search

- [ ] **Build a search index of entries and directory data together**, so one search box finds both "Corkman Hotel" (the entry) and every directory listing for it. Options: [Pagefind](https://pagefind.app/) (static, runs at build time, would need a GitHub Action) or [MiniSearch](https://github.com/lucaong/minisearch) / [Lunr](https://lunrjs.com/) indexes built in the browser or ahead of time.
- [ ] **Fuzzy matching for historical spellings** (Berkley/Berkeley, Leister/Leicester, Mrs/Mrs.), with a small list of known variants.
- [ ] Search results grouped by type (Entries / People / Places), with snippets and highlighted matches.
- [ ] "Trace this person/place across years" as a timeline view, built on the shared IDs that already exist.
- [ ] Shareable search URLs (`?q=…&year=…&street=…`).
- [ ] Load the search index only when the search panel is opened (see §1).

### 3. Editorial tools (towards a proper GUI for a non-technical team)

Goal: editors never need to touch GitHub directly. Done in small, fundable steps, with each step useful on its own.

**Markdown pages** (`aToZ.md`, `index.md` and other plain pages)

- [ ] **Visual editor for Markdown pages**: an admin page that lists the site's editable pages, opens one in a word-processor-style editor (headings, bold/italic, links, bullet lists; no Markdown syntax needed), shows a live preview in the site's own styles, and saves by opening a pull request that goes through the usual review. Front matter (`title`, `layout`) is shown as simple form fields or hidden, so it can't be broken by accident.
  - Candidate editors: [Toast UI Editor](https://ui.toast.com/tui-editor) or [Milkdown](https://milkdown.dev/) (both edit Markdown visually and save clean Markdown), or the off-the-shelf CMS options below.
- [ ] **A–Z editor**: a dedicated tool for `aToZ.md`. Add, remove, rename and re-letter featured pages from a list; it keeps entries alphabetical, builds the `civic?id=…` links, handles "see also" cross-references (e.g. *Carlton Inn, see: Corkman Hotel*), and flags which links already have a published entry and which are still wanted. Longer term, the A–Z could be generated from data (`civic/` plus a "wanted entries" list) rather than edited as text.

**Entries and submissions**

- [ ] **Accept/Reject buttons on the review page** (through the existing submission service or GitHub sign-in), with a "reason for rejection" box that is posted as a comment for the record.
- [ ] Edit a submission's text in the review page before accepting it.

**Directory/map data**

- [ ] **Data editor saves by pull request**: replace "download, then upload to GitHub by hand" with a *Submit changes* button that opens a pull request, as the contribution form already does. This removes the riskiest manual step and becomes much easier once the data is split into per-year JSON (§1).
- [ ] **Data-change preview on the review page**: show a readable table of changed records (before → after) instead of a raw diff.

**Off-the-shelf options to compare against building our own**

- [ ] Evaluate a git-based CMS such as [Decap CMS](https://decapcms.org/) or [Sveltia CMS](https://github.com/sveltia/sveltia-cms). These provide Markdown page editing, an editorial approval workflow and media uploads out of the box, and run on GitHub Pages without a server (they may need a small sign-in service). They may cover the Markdown editor and part of the review flow more cheaply than custom tools, but are less suited to the XML entries and the directory data.
- [ ] Later: revisit whether the Google Apps Script is still the best way to receive submissions, depending on which options above are chosen.

### 4. Making full and correct use of EAC-CPF

Goal: entries become proper, interoperable archival authority records that other systems (e.g. Trove, archives, the Encyclopedia of Melbourne) could understand and link to.

- [ ] **Use the right `entityType`**: `person`, `corporateBody` (hotels, breweries, companies, societies) or `family`. Topics like *Cesspits* or *Street Numbering* aren't really EAC-CPF entities, so decide whether they stay as entries with a local type (`localControl` / `localType`, e.g. "Topic", "Street", "Building") or move to a separate format. Using `concept` for everything is the first thing to correct.
- [ ] **Structured names**: `nameEntry` with proper `part localType="surname"` / `"forename"`, plus alternative and historical names (`nameEntryParallel`, `useDates`), e.g. *Carlton Inn* / *Corkman Hotel*. This would also fix the renderer, which currently assumes the first two `part`s are the family name and the given name.
- [ ] **Dates**: `existDates` with `dateRange` and `standardDate` attributes, so entries can be sorted, filtered by period and shown on a timeline.
- [ ] **Places**: `places` / `place` with `placeEntry` and coordinates (`latitude`/`longitude`), linking entries to the map.
- [ ] **Occupations, functions and legal status**: `occupations`, `functions`, `legalStatuses` (e.g. a hotel's licence).
- [ ] **Relationships**: `cpfRelation` between entries (licensee ↔ hotel, person ↔ family) and `resourceRelation` to sources and to `directoryData` records, displayed on the page as "Related" links.
- [ ] **Sources and citations**: `sources` / `source` for each entry, shown as a reference list.
- [ ] **Richer narrative**: structured `biogHist` (`abstract`, `chronList` for dated events), and render them on entry pages.
- [ ] **Better maintenance records**: one `maintenanceEvent` per edit (created / revised), with the agent who made it, and use `maintenanceStatus` correctly (`new` → `revised`).
- [ ] Have the submission form and editors produce valid, richer XML. Write a short EAC-CPF style guide (`docs/eac-cpf-guide.md`) with examples for each entity type.
- [ ] Validate entries against the EAC-CPF schema (see §5).

### 5. Quality and safety nets

- [ ] **GitHub Action that runs on every pull request**: check that XML is well-formed and valid EAC-CPF, check that data JSON is valid against the schema, and check that the entry filename matches the `recordId`. Editors would then see a green tick or red cross on each submission.
- [ ] Commit a `Gemfile` so local builds match GitHub Pages.
- [ ] Contributor guide (`CONTRIBUTING.md`) setting out entry conventions as they're agreed.

### 6. Maps and community geocoding

Placing records on the map is **ongoing community work**: about 16% of records have coordinates today, and that number should keep growing as volunteers contribute. The aim here is to make that work easy and inviting, not to finish it.

- [ ] **"Help put this on the map"**: on records without coordinates, a prompt that lets a volunteer drop a pin on the map and submit it for review.
- [ ] Show geocoding progress (e.g. "1,454 of 9,236 records mapped") on the map page as a community goal.
- [ ] Year slider/filter on the 2D map to show the precinct changing from 1900 to 1930.
- [ ] Link map markers to entries and entries to map locations (see §4, Places).
- [ ] Historical base map overlays (e.g. MMBW plans), if suitable public-domain scans are available.
- [ ] **Bring the experimental 3D map in line with the 2D map**: same data and features, and refactor so both maps share functions (e.g. data loading, filtering, popups) instead of duplicating code.

### 7. Look and feel

- [x] **Fix bulleted and numbered lists on content pages**, e.g. the area list on the home page. Done in #37: list styles for unclassed `ul`/`ol` inside `.main-content` in `styles/site.css`.
- [ ] **Style Markdown headings and other content**: only `.main-content h1` is styled, so `h2`/`h3`, rules, tables and blockquotes fall back to browser defaults. Add serif rules that use the site's tokens.
- [ ] **Fix the A–Z page**: replace the cramped letter-bar table (M/N is missing a pipe) with an evenly spaced letter list. Point the Back to Top links at `#featured-pages-a-to-z` instead of `#index-a-to-z`. Optionally mark which links have a published entry.
- [ ] **Restyle the contribution form to match the site**: use the site's tokens and fonts, size the iframe to its content instead of `min-height: 800px`, and remove the double rule under entry titles.
- [ ] **Give "Suggest new article" a proper page**: `new.md` needs a heading, a short explanation and site-styled controls.
- [ ] **People / Places contents**: show the year after each street name, e.g. "Bouverie Street (1905) listings". Sort by street within each year, and remove the extra `.facet-list` side padding on phones. One long page is fine.
- [ ] **Mobile pass**:
  - 2D map: collapse the layers panel on phones and use the moss accent colour.
  - 3D map: add a ← Home link and use `100dvh`.
  - Nav: fit all five items on one row on phones.
  - Search panel on phones: wait for the search redesign (§2).
- [ ] **Accessibility pass**: keyboard navigation for search and maps, contrast, focus styles and alt text.

### 8. Site and content

- [ ] Replace the "under construction" notice with a permanent, welcoming "this is a work in progress, and you can help" message that links to ways to contribute.
- [ ] Add an About page, Acknowledgement of Country, credits and licence to the site.
- [ ] Cite sources consistently on entry pages, with a "how to cite this page" box.
- [ ] Support images in entries.
- [ ] Use one name, "Featured pages", for the A–Z page everywhere (the footer says "A-Z Featured articles").

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
