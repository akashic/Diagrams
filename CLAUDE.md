# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This repo is not a codebase. It holds **system architecture descriptions** and the **architecture diagrams** made from them. Work follows two stages:

1. **Describe:** use the `grilling` skill to interview the user until the architecture is fully pinned down (`/grill-with-docs` also records terms and decisions as it goes).
2. **Diagram:** use the `archify` skill to turn the agreed description into validated, standalone HTML diagrams.

## Skills

The skills are installed globally (`~/.agents/skills/`, symlinked into `~/.claude/skills/`). They are not vendored here, and `.gitignore` blocks project-level installs. Don't reinstall them per project. Use `npx skills update -g` to update them.

- `grilling`: asks questions in rounds over a design tree, giving a recommended answer for each. Don't move to diagramming until the user confirms you've reached a shared understanding.
- `grill-with-docs` (user-invoked only): grilling plus `domain-modeling`. It writes `GLOSSARY.md` (domain terms only, no implementation detail) and `docs/adr/NNNN-*.md` (only for decisions that are hard to reverse, surprising, and real trade-offs). It creates these files lazily, when there is something to write.
- `archify`: CLI at `~/.agents/skills/archify/bin/archify.mjs` (Node >= 18). Follow its SKILL.md for authoring. Diagrams here use the "system description" path, so there is no source to trace and no `--repo-root`.

## Workflow conventions

- Grilling only produces a shared understanding in the conversation. Once the user confirms it, write it to `docs/architecture/<system>.md` before diagramming, so diagrams can be regenerated from a durable source. Where they exist, use `GLOSSARY.md` terms for node and relationship names.
- Choose the archify diagram type from the question (architecture, sequence, dataflow, lifecycle, erd, …). One system usually needs several diagrams. Draw each from the same description.
- By default archify writes each diagram to its own folder, `.archify/<type>-<slug>-<YYYYMMDD-HHMMSS>/`, holding `candidate.json` and `<slug>.html`. The candidate is the editable source. Repair by editing it and re-running `finalize`; never hand-edit the HTML.
- Diagrams use Microsoft visual style where possible. Product icons go **only** on as-built, product-level diagrams (architecture and sequences that name real products). Logical architecture, ERD and lifecycle diagrams stay unbranded.
- A diagram is done only when `finalize` exits zero:

  ```bash
  node ~/.agents/skills/archify/bin/archify.mjs finalize <type> <candidate.json> <output.html> --quality showcase --json
  ```

## Icons

`icons/` holds the official Microsoft icon packs (Azure, Power Platform, Entra, Microsoft 365 content) plus Microsoft 365 app logos from msicons.com. `icons/README.md` lists the source links, usage terms and folder contents. Check there before downloading anything, and add newly downloaded icons to `icons/` with a README entry.

Archify can't use these SVGs directly. Its `brand` field takes only a raster image at an http(s) URL, pinned by SHA-256. The workflow (full commands in `icons/README.md`):

1. Render the SVG with `sips -s format png -Z 128 <svg> --out icons/png/<name>.png`.
2. Commit and push. The repo is public, so it is served at `https://raw.githubusercontent.com/akashic/Diagrams/main/icons/png/<name>.png`.
3. Run `archify.mjs brands capture <url> --json` and put the returned `{url, sha256}` in the node's `brand`.

`icons/brands.json` holds ready-to-use, already-captured `brand` values for every PNG in `icons/png/` (`power-apps`, `power-automate`, `dataverse`, `azure-openai`, `excel`, `outlook`, `sharepoint`, `entra-id`). Copy from it rather than re-capturing, and add an entry whenever you capture a new icon. Never overwrite a PNG that a diagram uses, because its pinned digest would stop matching. Add a new file instead. Archify has no colour or font settings, so "Microsoft style" means these icons plus Microsoft product names, not a custom palette.

## GitHub Pages site

The repo is published at https://akashic.github.io/Diagrams/ (GitHub Pages, legacy build from `main` at `/`). `index.html` is the hand-written overview page. It has one `<section class="system">` per system, with diagram cards that link straight to the archify HTML in `.archify/`. Card thumbnails are in `assets/thumbs/`.

- `.nojekyll` must stay. Without it, Jekyll drops `.archify/` (dot-folders) and every diagram link 404s.
- Archify folder names are timestamped, so any new or regenerated diagram means updating its card's `href` in `index.html` and regenerating its thumbnail:
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --window-size=1440,900 --virtual-time-budget=4000 --screenshot=assets/thumbs/<slug>.png "file://$PWD/.archify/<folder>/<slug>.html" && sips -Z 960 assets/thumbs/<slug>.png
  ```
- A new system gets its own section, with links to its architecture description, glossary and ADRs.
