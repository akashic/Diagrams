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
- A diagram is done only when `finalize` exits zero:

  ```bash
  node ~/.agents/skills/archify/bin/archify.mjs finalize <type> <candidate.json> <output.html> --quality showcase --json
  ```
