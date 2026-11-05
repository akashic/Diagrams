# Icons

Microsoft product and service icons for the as-built (product-level) diagrams in this repo.

## Sources

| Folder | Contents | Source |
| --- | --- | --- |
| `azure/` | Azure Public Service Icons V24 (SVG, grouped by category). Includes Azure OpenAI and the Entra service icons. | [Azure architecture icons](https://learn.microsoft.com/en-us/azure/architecture/icons/) |
| `power-platform/` | Power Apps, Power Automate, Dataverse, Power Pages, AI Builder, Power Platform, Copilot Studio (SVG). | [Power Platform icons](https://learn.microsoft.com/en-us/power-platform/guidance/icons) |
| `entra/` | Microsoft Entra product icons (Oct 2023), `color/` and `bw/` (SVG). | [Microsoft Entra architecture icons](https://learn.microsoft.com/en-us/entra/architecture/architecture-icons) |
| `microsoft-365-content/` | 2024 Microsoft 365 content icons: generic concept icons in Microsoft, SharePoint, Teams, Planner and Project colours (SVG and PNG). They are **not** app logos. | [Microsoft 365 architecture icons and templates](https://learn.microsoft.com/en-us/previous-versions/microsoft-365/solutions/architecture-icons-templates) |
| `microsoft-365-apps/` | Microsoft 365 app logos (Excel, Outlook, SharePoint, Teams, Word, OneDrive, and others) (SVG). None of the official packs above include them. | [MS Icons](https://msicons.com/), a community browser over the official packs |
| `png/` | PNG renders of the icons used in diagrams (see below). | Generated from the SVGs above |

The Microsoft 365 Visio stencils and the Entra branding playbook (`.pptx`) were not downloaded. Get them from the pages above if needed.

## Usage terms

Microsoft permits these icons in architecture diagrams, training materials and documentation. They may be copied, distributed and displayed only for that use. Don't crop, flip, rotate, distort or recolour them, and don't use them to represent a non-Microsoft product. The full terms ship inside the packs (`azure/Microsoft_Terms_of_Use.pdf`, `power-platform/CELA_Licenses_Public_Use_Icons.pdf`, `entra/Microsoft Terms of Use.docx`).

## Using an icon in an archify diagram

Archify's `brand` field accepts only a **raster image at an http(s) URL** (PNG, JPEG, WebP, ICO), pinned by SHA-256. It does not accept local paths or SVG. So:

1. Render the SVG to PNG into `png/`, using a clear lowercase name:
   ```bash
   sips -s format png -Z 128 "icons/power-platform/Power Platform/PowerApps_scalable.svg" --out icons/png/power-apps.png
   ```
2. Commit and push. The repo is public, so the file is served from
   `https://raw.githubusercontent.com/akashic/Diagrams/main/icons/png/power-apps.png`.
3. Capture it to get the digest:
   ```bash
   node ~/.claude/skills/archify/bin/archify.mjs brands capture "https://raw.githubusercontent.com/akashic/Diagrams/main/icons/png/power-apps.png" --json
   ```
4. Put the returned `{ "url", "sha256" }` in the node's `brand` field. Archify embeds the image in the output HTML, so the diagram works offline.

Don't overwrite a PNG that a diagram already uses: the pinned digest will stop matching. Add a new file instead.
