# Proposal: a simple editor for Markdown pages

*Status: proposal, for discussion. No code has been changed.*
*Roadmap: [§3 Editorial tools → Markdown pages](../../README.md#3-editorial-tools-towards-a-proper-gui-for-a-non-technical-team)*

## The problem

Plain pages such as the [Featured pages A–Z](https://notamitchell.github.io/order/aToZ) (`aToZ.md`) and the home page (`index.md`) can only be changed by editing Markdown on GitHub. The editorial team is not technical, so in practice these pages only change when a developer has time. The A–Z also has to be updated by hand every time an entry is published.

The aim is a page where an editor can open one of these pages, change it without seeing Markdown or front matter, and send the change into the **same review flow** as public submissions, so nothing goes live without a second pair of eyes.

## How it would work

```
 Editor ──▶ admin/pages.html
              1. pick a page (aToZ, index, …)
              2. edit it (visual editor, site styles)
              3. "Send for review" + short note
                   │
                   ▼
            save service ──▶ copy to the team's Google Sheet (backup)
                   │
                   ▼
            branch + commit + pull request  ("✏️ Page edit: Featured pages A–Z")
                   │
 Reviewer ──▶ admin/review.html ── lists it next to entry submissions,
                                   shows the rendered page and what changed
                   │
                   ▼
            Accept (merge) / Reject (close) ──▶ GitHub Pages rebuilds
```

Three decisions shape the design: **how editors edit**, **how a change is saved**, and **how it is reviewed**. Options for each are below, with a recommendation.

## 1. How editors edit

| Option | What the editor sees | Pros | Cons |
|---|---|---|---|
| **A. Text box + live preview** (e.g. [EasyMDE](https://github.com/Ionaru/easy-markdown-editor)) | Markdown text with a formatting toolbar, preview beside it | Smallest and safest: the file is saved exactly as typed, no reformatting | Editors still see `##`, `[ ](…)` and `---` |
| **B. Visual editor** ([Toast UI Editor](https://ui.toast.com/tui-editor)) | A word-processor view, with a Markdown tab for power users | No Markdown needed; one CDN script, no build step (fits this Jekyll site) | Re-writes the file on save (see the link problem below); larger download |
| **C. A–Z list editor** (purpose-built for `aToZ.md`) | A list of featured pages: title, linked entry, "see also" target; add / remove / rename | Hardest to break; keeps letters in order and builds `civic?id=…` links for you; can flag entries that don't exist yet | Only works for the A–Z; other pages still need A or B |

[Milkdown](https://milkdown.dev/), mentioned in the roadmap, needs a JavaScript build step, which the site doesn't have, so Toast UI is the better fit for option B.

**The link problem.** 67 of the links in `aToZ.md` have spaces in them, e.g. `[Ballarat Road](civic?id=Ballarat Road)`. Jekyll accepts these, but standard Markdown (which visual editors use) does not, so a visual editor would either break them or rewrite every one on first save. Before option B is used on the A–Z, the links should be cleaned up once to use `%20` (one line already does: `civic?id=Corkman%20Hotel`). Option C avoids the problem by building the links itself.

**Front matter** (`title`, `layout`) is shown as a single "Page title" field; `layout` and other settings are hidden and kept as they are.

**Which pages.** Only an allowlist of plain content pages: `aToZ.md` and `index.md` to start. Pages that are just layout switches (`map.md`, `civic.md`, `form.md`, …) are not editable here.

## 2. How a change is saved

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A. Extend the existing Apps Script** | Add a "page edit" action to the Google Apps Script that already handles contributions. Today it saves a copy of each submission to a Google Sheet in the team's shared Drive folder, then opens a pull request. A page edit would do the same: save the page path, new text, editor's name and note as a row, then open a PR | Same path as submissions; editors need no GitHub account; the GitHub credentials stay in the script; every edit also lands in the Sheet, giving the team a readable backup and log of page changes without opening GitHub | Changes code that lives outside this repo; anyone who finds the admin page could *propose* an edit (but it still needs review, just like public submissions) |
| **B. Sign in to GitHub in the browser** | Editor signs in (personal token or OAuth); the page commits a branch and opens the PR directly | No new server-side code; edits are attributed to real GitHub users | Every editor needs a GitHub account and a token, which is the step the team finds hardest today; OAuth needs a small sign-in service |
| **C. Off-the-shelf CMS** ([Decap](https://decapcms.org/) / [Sveltia](https://github.com/sveltia/sveltia-cms)) | CMS provides the editor, saving and its own draft → review → publish board | Mature, includes media uploads | A second review screen separate from `admin/review.html`; needs a sign-in service; poor fit for the XML entries, so editors would use two tools |

Whichever option is chosen, the save should **include the version of the page the editor started from**. If someone else has changed the page since, the editor is told to reload instead of quietly overwriting their work.

## 3. How it fits the review flow

`admin/review.html` currently only lists pull requests that change `civic/*.xml`. It would change so that:

- **It also lists page edits**, i.e. PRs that change an allowlisted `*.md` page, labelled "Page edit" alongside "New entry" / "Entry update". A consistent branch prefix (`page-edit-…`) and PR title make these easy to tell apart.
- **Preview**: GitHub Pages can't build a preview of a branch, so the review page renders the Markdown itself (with [marked](https://marked.js.org/) and `styles/site.css`) inside the preview frame, the same way it already previews XML from the PR branch.
- **What changed**: a plain-language before/after view (added lines in green, removed in red; the page already defines these colours). For the A–Z, where a change is often one line, this matters more than the full preview.
- **Accept / Reject** work exactly as for submissions today. If the roadmap's "Accept/Reject buttons on the review page" lands first, page edits get them for free.
- **Needs changes**: the reviewer can open the same page in the editor, starting from the PR's version, and save onto the same PR rather than rejecting and starting again (the current workaround described on the review page).

## Recommendation

1. **Phase 1, smallest useful step:** editor option **A** (text + preview) for `index.md` and `aToZ.md`, saving through the **Apps Script (2A)**, and `review.html` listing and previewing page edits. This proves the save and review path end to end with little risk.
2. **Phase 2:** the **A–Z list editor (1C)**, since the A–Z is the page that changes most and every new entry needs a line in it. Clean up the A–Z links at the same time.
3. **Phase 3, if editors want it:** switch the general editor to **Toast UI (1B)** once the links are clean.
4. Revisit a CMS (2C) only if the team later needs media uploads or many more editable pages.

## Open questions for the team

- Who should be able to open the page editor: anyone with the link (edits still reviewed), or only signed-in editors?
- Who maintains the Apps Script, and should page edits go in the same Google Sheet as submissions or in their own tab?
- Should the person who made an edit be allowed to accept it, or must a second editor review it?
- Beyond the A–Z and home page, which pages should be editable (e.g. a future About page)?

## Noticed while looking

The A–Z "Back to Top" links point to `#index-a-to-z`, but the page heading is "Featured pages: A to Z", whose anchor is `#featured-pages-a-to-z`, so those links probably don't jump to the top. Option C would generate these links correctly; it's also a one-line fix on its own.
