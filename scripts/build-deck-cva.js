// Builds exports/client-valuation-automation.pptx from the diagram PNGs.
// Prereqs (run from a scratch folder holding this file): `npm install pptxgenjs@3.12.0`, a copy of the pptx skill's
// scripts/apply_theme.js beside it, and ./img/<slug>.png = exports/png/<slug>.png with the top 128px title band cropped off
// (sips -c <h-128> <w-4> --cropOffset 128 2 ...). Then: node build-deck-cva.js
const pptxgen = require("pptxgenjs");
const { execSync } = require("child_process");
const path = require("path");
const { applyTheme } = require("./apply_theme.js");

const REPO = "/Users/gilesgregg/Documents/GitHub/Diagrams";
const IMG = path.join(__dirname, "img");
const ICON = path.join(REPO, "icons/png");
const OUT = path.join(REPO, "exports/client-valuation-automation.pptx");
const SITE = "https://akashic.github.io/Diagrams/";
const GH = "https://github.com/akashic/Diagrams/blob/main/";

const THEME = {
  name: "Client Valuation Automation",
  headFontFace: "Calibri",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B1B1B", lt1: "FFFFFF", dk2: "0B2545", lt2: "F2F5F9",
    accent1: "0F6CBD", accent2: "742774", accent3: "107C41",
    accent4: "C3D6EE", accent5: "616161", accent6: "479EF5",
    hlink: "0F6CBD", folHlink: "742774",
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "Client Valuation Automation: architecture diagrams";
pres.author = "Giles";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

const W = 13.333, M = 0.6;

// ---------- Layouts ----------
pres.defineSlideMaster({
  title: "Title",
  background: { color: THEME.colors.dk2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: M, y: 2.35, w: 10.5, h: 1.5, fontSize: 48, bold: true, color: C.background1, valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: M, y: 4.05, w: 10.5, h: 1.0, fontSize: 22, color: C.accent4, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "Section",
  background: { color: THEME.colors.dk2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: M, y: 2.9, w: 9, h: 1.1, fontSize: 44, bold: true, color: C.background1, valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: M, y: 4.15, w: 9, h: 0.9, fontSize: 20, color: C.accent4, valign: "top", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: W - 1.1, y: 6.95, w: 0.6, h: 0.3, fontSize: 11, color: C.accent4, align: "right" },
});
pres.defineSlideMaster({
  title: "Content",
  background: { color: THEME.colors.lt1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.35, w: W - 2 * M, h: 0.75, fontSize: 36, bold: true, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: M, y: 1.08, w: W - 2 * M, h: 0.45, fontSize: 16, color: C.accent5, valign: "top", margin: 0 }, text: "" } },
    { text: { text: "Client Valuation Automation", options: { x: M, y: 6.95, w: 6, h: 0.3, fontSize: 11, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: W - 1.1, y: 6.95, w: 0.5, h: 0.3, fontSize: 11, color: C.accent5, align: "right" },
});

// ---------- Helpers ----------
const shadow = () => ({ type: "outer", color: "000000", opacity: 0.12, blur: 8, offset: 2, angle: 90 });

// Diagram in a light rounded panel, fitted to the box by aspect ratio.
function diagram(slide, file, box, alt) {
  const { w: pw, h: ph } = imgSize(file);
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.12, fill: { color: C.background2 }, line: { color: "DDE3EA", width: 0.75 }, shadow: shadow(), objectName: "Diagram panel" });
  const pad = 0.15, bw = box.w - 2 * pad, bh = box.h - 2 * pad;
  const s = Math.min(bw / pw, bh / ph), w = pw * s, h = ph * s;
  slide.addImage({ path: path.join(IMG, file), x: box.x + pad + (bw - w) / 2, y: box.y + pad + (bh - h) / 2, w, h, altText: alt, objectName: "Diagram" });
}
function imgSize(file) {
  const out = execSync(`sips -g pixelWidth -g pixelHeight "${path.join(IMG, file)}"`).toString();
  return { w: +out.match(/pixelWidth: (\d+)/)[1], h: +out.match(/pixelHeight: (\d+)/)[1] };
}

// Numbered key points in a column: blue number circle + bold lead + text.
function points(slide, x, y, w, items) {
  const rowH = 1.55;
  items.forEach(([lead, text], i) => {
    const top = y + i * rowH;
    slide.addText(String(i + 1), { shape: pres.shapes.OVAL, x, y: top, w: 0.42, h: 0.42, fill: { color: C.accent1 }, color: C.background1, fontSize: 14, bold: true, align: "center", valign: "middle", margin: 0, objectName: `Point ${i + 1} number` });
    slide.addText([
      { text: lead, options: { bold: true, color: C.text2, breakLine: true } },
      { text, options: { color: C.text1 } },
    ], { isTextBox: true, x: x + 0.6, y: top - 0.04, w: w - 0.6, h: rowH - 0.15, fontSize: 14, valign: "top", margin: 0, paraSpaceAfter: 2, objectName: `Point ${i + 1}` });
  });
}

function diagramSlide({ section, title, sub, file, alt, side, items, notes }) {
  const s = pres.addSlide({ masterName: "Content", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  s.addText(sub, { placeholder: "body" });
  const top = 1.75, h = 5.0, textW = side === "wide" ? 4.0 : 5.4;
  const imgW = W - 2 * M - textW - 0.5;
  diagram(s, file, { x: M, y: top, w: imgW, h }, alt);
  points(s, M + imgW + 0.5, top + 0.15, textW, items);
  s.addNotes(notes);
  return s;
}

// ---------- Slides ----------
pres.addSection({ title: "Overview" });
let s = pres.addSlide({ masterName: "Title", sectionTitle: "Overview" });
s.addText("Client Valuation Automation", { placeholder: "title" });
s.addText("Architecture diagrams · October 2026", { placeholder: "body" });
s.addText([{ text: "Interactive versions: ", options: { color: C.accent4 } }, { text: SITE, options: { color: C.background1, hyperlink: { url: SITE } } }],
  { isTextBox: true, x: M, y: 6.6, w: 10, h: 0.4, fontSize: 14, margin: 0, objectName: "Site link" });
s.addNotes("Client Valuation Automation finds the publicly traded companies most comparable to a private Client, scores the match with AI, and emails an Excel report. Every diagram in this deck is also published as an interactive page at " + SITE);

// Overview: stats + process + built with
s = pres.addSlide({ masterName: "Content", sectionTitle: "Overview" });
s.addText("How it works", { placeholder: "title" });
s.addText("From a Client description to an emailed Valuation Report, with no manual comparison work", { placeholder: "body" });
const stats = [["~40,000", "Listed Companies to search"], ["≤ 50", "companies in each Shortlist"], ["1", "AI Match Score per company"]];
const colW = (W - 2 * M - 2 * 0.4) / 3;
stats.forEach(([big, label], i) => {
  const x = M + i * (colW + 0.4);
  s.addText(big, { isTextBox: true, x, y: 1.85, w: colW, h: 0.9, fontSize: 48, bold: true, color: C.accent1, margin: 0, valign: "bottom", objectName: `Stat ${i + 1}` });
  s.addText(label, { isTextBox: true, x, y: 2.78, w: colW, h: 0.4, fontSize: 16, color: C.accent5, margin: 0, objectName: `Stat ${i + 1} label` });
});
const steps = [
  ["Describe and search", "The User describes the Client and narrows Search Criteria; options and counts update live, and search returns the top 50 by Market Cap."],
  ["Score", "Each Shortlist Entry is compared with the Client description by Azure OpenAI, giving a Match Score and rationale."],
  ["Report", "Scores fill an Excel workbook, sorted by Match Score, which is emailed to the User as the Valuation Report."],
];
steps.forEach(([lead, text], i) => {
  const x = M + i * (colW + 0.4), y = 3.55, h = 2.0;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: colW, h, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: "DDE3EA", width: 0.75 }, objectName: `Step ${i + 1} card` });
  s.addText(String(i + 1), { shape: pres.shapes.OVAL, x: x + 0.3, y: y + 0.3, w: 0.42, h: 0.42, fill: { color: C.accent1 }, color: C.background1, fontSize: 14, bold: true, align: "center", valign: "middle", margin: 0, objectName: `Step ${i + 1} number` });
  s.addText(lead, { isTextBox: true, x: x + 0.9, y: y + 0.3, w: colW - 1.2, h: 0.42, fontSize: 18, bold: true, color: C.text2, valign: "middle", margin: 0, objectName: `Step ${i + 1} title` });
  s.addText(text, { isTextBox: true, x: x + 0.3, y: y + 0.85, w: colW - 0.6, h: h - 1.0, fontSize: 14, color: C.text1, valign: "top", margin: 0, objectName: `Step ${i + 1} text` });
  if (i < 2) s.addShape(pres.shapes.CHEVRON, { x: x + colW + 0.11, y: y + h / 2 - 0.15, w: 0.18, h: 0.3, fill: { color: C.accent4 }, line: { type: "none" }, objectName: "Step arrow" });
});
s.addText("Built with", { isTextBox: true, x: M, y: 5.95, w: 1.15, h: 0.5, fontSize: 14, bold: true, color: C.accent5, valign: "middle", margin: 0, objectName: "Built with label" });
[["power-apps", "Power Apps"], ["dataverse", "Dataverse"], ["power-automate", "Power Automate"], ["azure-openai", "Azure OpenAI"], ["excel", "Excel"], ["outlook", "Outlook"]].forEach(([icon, label], i) => {
  const x = M + 1.2 + i * 1.8;
  s.addImage({ path: path.join(ICON, icon + ".png"), x, y: 6.0, w: 0.4, h: 0.4, altText: label + " icon", objectName: label + " icon", sizing: { type: "contain", w: 0.4, h: 0.4 } });
  s.addText(label, { isTextBox: true, x: x + 0.5, y: 6.0, w: 1.3, h: 0.4, fontSize: 12, color: C.text1, valign: "middle", margin: 0, objectName: label + " label" });
});
s.addNotes("Three numbers frame the system: about 40,000 Listed Companies, Shortlists of at most 50, and one AI Match Score per Shortlist Entry. The flow is describe and search, then score, then report. It is built entirely on Power Platform, Azure OpenAI and Microsoft 365.");

// Architecture
pres.addSection({ title: "Architecture" });
s = pres.addSlide({ masterName: "Section", sectionTitle: "Architecture" });
s.addText("Architecture", { placeholder: "title" });
s.addText("The logical design, and how it was built on Power Platform", { placeholder: "body" });

diagramSlide({
  section: "Architecture", title: "Logical architecture", sub: "Technology-neutral components and how a request moves through them",
  file: "cva-logical.png", alt: "Logical architecture diagram of Client Valuation Automation", side: "wide",
  items: [
    ["Search Service", "Gets narrowed options and live counts for the Search Criteria, then returns the top 50 by Market Cap."],
    ["Asynchronous orchestration", "Submitting a Shortlist creates a Valuation Request. The Orchestrator handles it, so the User never waits."],
    ["Score, build, deliver", "The AI Scoring Service gives each entry a Match Score, the Report Service builds the workbook, and Email delivers it."],
  ],
  notes: "The logical view is product-neutral. The User signs in through the Identity Provider and uses the Web App, which calls the Search Service against the Company Database. On submit, the Orchestrator scores each Shortlist Entry, builds the Valuation Report and emails it. Listed Companies are imported monthly from the Market Data Vendor.",
});
diagramSlide({
  section: "Architecture", title: "As built on Power Platform", sub: "The same design realised with Power Platform, Microsoft 365 and Azure",
  file: "cva-power-platform.png", alt: "Power Platform as-built architecture diagram", side: "wide",
  items: [
    ["Form only in the app", "The Canvas Power App calls instant Power Automate flows for search, which avoids delegation limits over 40,000 rows."],
    ["Triggered, not called", "A Dataverse row-added trigger on the Valuation Request starts the orchestration flow."],
    ["Native Microsoft 365", "Azure OpenAI via a custom connector, a SharePoint template filled by Excel Online, delivered by Outlook."],
  ],
  notes: "Each logical component maps to one product: Canvas Power App, Power Automate search flows, Dataverse, an automated orchestration flow, Azure OpenAI through a custom connector, SharePoint plus Excel Online for the report, Outlook for email, and Entra ID for sign-in. A Dataverse dataflow imports company data monthly. See ADR 0001 for why Power Platform was chosen.",
});

// Behaviour
pres.addSection({ title: "Behaviour" });
s = pres.addSlide({ masterName: "Section", sectionTitle: "Behaviour" });
s.addText("Behaviour", { placeholder: "title" });
s.addText("Searching, scoring and reporting, and the Valuation Request lifecycle", { placeholder: "body" });

diagramSlide({
  section: "Behaviour", title: "Search sequence", sub: "Filter options that narrow with each selection, live counts and the top-50 search",
  file: "cva-sequence-search.png", alt: "Sequence diagram of the search flow", side: "tall",
  items: [
    ["Reference lists load directly", "Sector, Industry and Country lists come straight from Dataverse reference tables."],
    ["Every selection narrows the rest", "Each change calls the get-options and count flows, so the form narrows itself and shows a live count."],
    ["Top 50, all or nothing", "Search returns the top 50 by Market Cap. The User refines or submits the whole list; zero matches blocks submit."],
  ],
  notes: "After signing in with Entra ID, the app loads the reference lists from Dataverse. Each selection change calls two flows: get options, which returns the values still possible in each filter, and count. Search returns the top 50 by Market Cap, largest first. The User either refines or submits the whole list as the Shortlist.",
});
diagramSlide({
  section: "Behaviour", title: "Scoring and report sequence", sub: "From Shortlist submission to the emailed Valuation Report",
  file: "cva-sequence-scoring.png", alt: "Sequence diagram of the scoring and report flow", side: "tall",
  items: [
    ["Write, then trigger", "The app writes the Valuation Request and its Shortlist Entries. A Dataverse trigger starts orchestration."],
    ["Parallel scoring", "Apply to each scores every entry with Azure OpenAI. Once retries run out, the entry is marked not scored and the loop continues."],
    ["Report and failure path", "Rows are sorted by Match Score and emailed as an attachment. If a whole stage fails, the request becomes Failed and the User gets a failure email."],
  ],
  notes: "Statuses move Submitted, Scoring, Building Report, Sent. Each Azure OpenAI call receives the Client description, Search Criteria and the Listed Company's description and metadata, and returns JSON with a score and rationale. The report is a copied SharePoint template filled with Excel Online, plus a summary sheet, sent by Outlook.",
});

// Lifecycle: full-width diagram with three cards below
s = pres.addSlide({ masterName: "Content", sectionTitle: "Behaviour" });
s.addText("Valuation Request lifecycle", { placeholder: "title" });
s.addText("Every request ends in Sent or Failed", { placeholder: "body" });
diagram(s, "cva-lifecycle.png", { x: M, y: 1.75, w: W - 2 * M, h: 3.0 }, "State diagram of the Valuation Request lifecycle");
const cards = [
  ["Happy path", "Submitted → Scoring → Building Report → Sent. Each step is driven by the orchestration flow."],
  ["Partial scoring is not failure", "An entry that can't be scored is marked not scored and shown in the report. It never fails the request."],
  ["No Draft state", "Searches before submission aren't saved. A request exists only once the Shortlist is submitted."],
];
cards.forEach(([lead, text], i) => {
  const x = M + i * (colW + 0.4), y = 5.05, h = 1.6;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: colW, h, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: "DDE3EA", width: 0.75 }, objectName: `Card ${i + 1}` });
  s.addText([{ text: lead, options: { bold: true, color: C.text2, breakLine: true } }, { text, options: { color: C.text1 } }],
    { isTextBox: true, x: x + 0.3, y: y + 0.2, w: colW - 0.6, h: h - 0.35, fontSize: 14, valign: "top", margin: 0, paraSpaceAfter: 4, objectName: `Card ${i + 1} text` });
});
s.addNotes("Failed can be reached from Submitted, Scoring or Building Report, and sends the User a failure email. A single unscored Shortlist Entry does not fail the request.");

// Data
pres.addSection({ title: "Data" });
s = pres.addSlide({ masterName: "Section", sectionTitle: "Data" });
s.addText("Data", { placeholder: "title" });
s.addText("Six Dataverse tables behind search, requests and scoring", { placeholder: "body" });

diagramSlide({
  section: "Data", title: "Data model", sub: "Reference data, Listed Companies, and Valuation Requests with their Shortlist Entries",
  file: "cva-erd.png", alt: "Entity relationship diagram of the six Dataverse tables", side: "wide",
  items: [
    ["Reference data", "Every Industry belongs to one Sector. Sector, Industry and Country feed the Search Criteria options."],
    ["Listed Company", "Name, description and Market Cap in USD, with lookups to Industry and Country."],
    ["Requests and entries", "Each Valuation Request has 1 to 50 Shortlist Entries, holding the search rank, Match Score, rationale and scoring status."],
  ],
  notes: "Search Criteria are saved on the Valuation Request as a JSON snapshot. Statuses: Submitted, Scoring, Building Report, Sent, Failed. Scoring status: pending, scored, not scored. The owner is a lookup to the Dataverse system user table, which is outside this model.",
});

// Close
pres.addSection({ title: "Close" });
s = pres.addSlide({ masterName: "Title", sectionTitle: "Close" });
s.addText("Explore the diagrams", { placeholder: "title" });
s.addText([{ text: SITE, options: { hyperlink: { url: SITE }, color: C.background1 } }], { placeholder: "body" });
const links = [["Architecture description", GH + "docs/architecture/client-valuation-automation.md"], ["Glossary", GH + "GLOSSARY.md"], ["ADR 0001: Build on Power Platform", GH + "docs/adr/0001-build-on-power-platform.md"]];
s.addText(links.map(([t, u], i) => ({ text: t, options: { hyperlink: { url: u }, color: C.accent4, bullet: true, breakLine: i < links.length - 1 } })),
  { isTextBox: true, x: M, y: 5.0, w: 8, h: 1.4, fontSize: 16, margin: 0, paraSpaceAfter: 6, valign: "top", objectName: "Source links" });
s.addNotes("Every diagram is interactive on the site, with light and dark themes and export options. The architecture description, glossary and ADR are the sources the diagrams were drawn from.");

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();
