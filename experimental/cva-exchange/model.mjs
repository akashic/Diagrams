// Truth for the tube-exchange figure. Pure data and pure functions: the geometry, the readout and the
// motion all read from here, so the figure can't disagree with the diagram it was made from.
//
// STATIONS and LINES restate .archify/architecture-cva-power-platform-*/candidate.json. build.mjs reads that
// candidate and fails if a station, line, direction or label here no longer matches it.
//
// STEPS restate Flow 2 and Flow 3 of docs/architecture/client-valuation-automation.md.
// The company counts on the search steps and the Match Scores are illustrative: no real run is being replayed.

export const STATIONS = {
  user: { name: "User", role: "valuation staff", kind: "desk" },
  entra: { name: "Microsoft Entra ID", role: "work-account sign-in", kind: "lock" },
  app: { name: "Canvas Power App", role: "request form", kind: "console" },
  search: { name: "Search flows", role: "instant Power Automate", kind: "canisters" },
  dv: { name: "Dataverse", role: "Listed Companies + requests", kind: "cabinet" },
  dataflow: { name: "Dataverse dataflow", role: "Power Query · monthly", kind: "calendar" },
  vendor: { name: "Market Data Vendor", role: "Listed Company data", kind: "crate" },
  orch: { name: "Orchestration flow", role: "automated · row added", kind: "programmer" },
  aoai: { name: "Azure OpenAI", role: "GPT-4-class · custom connector", kind: "gauge" },
  excel: { name: "Excel Online (Business)", role: "connector", kind: "press" },
  sharepoint: { name: "SharePoint", role: "template workbook", kind: "rack" },
  outlook: { name: "Office 365 Outlook", role: "connector", kind: "franker" },
};

// variant follows the diagram's own legend: emphasis is the main path, security is sign-in, dashed is the
// scheduled import, and no variant is an ordinary call or a return. The figure draws each as its own kind of line.
export const LINES = [
  { id: "sign-in", from: "user", to: "entra", label: "sign in", variant: "security" },
  { id: "enter-criteria", from: "user", to: "app", label: "Client + Search Criteria", variant: "emphasis" },
  { id: "search-ops", from: "app", to: "search", label: "get options · count · search", variant: "emphasis" },
  { id: "query-companies", from: "search", to: "dv", label: "query Listed Companies" },
  { id: "submit-request", from: "app", to: "dv", label: "submit Valuation Request", variant: "emphasis" },
  { id: "monthly-pull", from: "vendor", to: "dataflow", label: "monthly pull", variant: "dashed" },
  { id: "upsert", from: "dataflow", to: "dv", label: "upsert in place", variant: "dashed" },
  { id: "row-added", from: "dv", to: "orch", label: "row added trigger", variant: "emphasis" },
  { id: "update-request", from: "orch", to: "dv", label: "status + Match Scores" },
  { id: "score-entries", from: "orch", to: "aoai", label: "score each Shortlist Entry", variant: "emphasis" },
  { id: "return-scores", from: "aoai", to: "orch", label: "JSON score + rationale" },
  { id: "copy-template", from: "orch", to: "sharepoint", label: "copy template per request" },
  { id: "return-workbook", from: "sharepoint", to: "orch", label: "workbook file" },
  { id: "fill-rows", from: "orch", to: "excel", label: "add rows · fill summary", variant: "emphasis" },
  { id: "write-workbook", from: "excel", to: "sharepoint", label: "write workbook" },
  { id: "send-email", from: "orch", to: "outlook", label: "send report or failure notice", variant: "emphasis" },
  { id: "deliver-report", from: "outlook", to: "user", label: "Valuation Report (Excel)", variant: "emphasis" },
];

// Boundaries in the diagram become the raised plates the stations stand on.
export const PLATES = [
  { id: "power-platform", name: "Power Platform environment (production)", members: ["app", "search", "dv", "dataflow", "orch"] },
  { id: "m365", name: "Microsoft 365", members: ["outlook", "sharepoint", "excel"] },
  { id: "azure", name: "Azure", members: ["aoai"] },
];

// The six Dataverse tables, one drawer each, in the order of the data model.
export const TABLES = ["Sector", "Industry", "Country", "Listed Company", "Valuation Request", "Shortlist Entry"];

// The five lifecycle statuses, one stop each on the programmer's status rail.
export const STATUSES = ["Submitted", "Scoring", "Building Report", "Sent", "Failed"];

export const COMPANIES = 40000; // about 40,000 Listed Companies
export const SHORTLIST = 50; // search returns the top 50 by Market Cap
export const COLUMNS = 7; // name, Sector, Industry, Country, Market Cap, Match Score, rationale
export const FILTERS = 5; // Sectors, Industries, Countries, Market Cap min, Market Cap max
export const SEARCH_OPS = ["get options", "count", "search"]; // three instant flows, one canister each
export const MONTHS = 12;

// Illustrative: a small repeatable sequence, so the needle is the same on every run and every reload.
export const UNSCORED = 37; // the one Shortlist Entry this run marks "not scored", which does not fail the request
export function scoreOf(entry) {
  if (entry === UNSCORED) return null;
  return 34 + ((entry * 61 + (entry * entry) % 17) % 63);
}
export function scoredCount(entriesDone) {
  return entriesDone - (entriesDone >= UNSCORED ? 1 : 0);
}

// One run, in the order the description gives. Each step sends one capsule down one line.
// `n` repeats the step; the scoring round trip stands for a parallel Apply to each over all 50 entries.
export const STEPS = [
  { line: "monthly-pull", say: "Monthly import pulls from the vendor", drawer: null, month: true },
  { line: "upsert", say: "Dataflow upserts in place", drawer: 3 },
  { line: "sign-in", say: "User signs in" },
  { line: "enter-criteria", say: "User enters Client + Search Criteria", count: COMPANIES },
  { line: "search-ops", say: "get options · count", op: 0, count: 2140 },
  { line: "query-companies", say: "Query Listed Companies", drawer: 3, count: 2140 },
  { line: "search-ops", say: "count narrows as filters change", op: 1, count: 312 },
  { line: "query-companies", say: "Query Listed Companies", drawer: 3, count: 312 },
  { line: "search-ops", say: "search: top 50 by Market Cap", op: 2, count: SHORTLIST },
  { line: "query-companies", say: "Query Listed Companies", drawer: 3, count: SHORTLIST },
  { line: "submit-request", say: "Submit: writes the Valuation Request and its Shortlist Entries", drawer: 4, status: 0, count: SHORTLIST },
  { line: "row-added", say: "Row added starts the Orchestration flow", drawer: 4, status: 0 },
  { line: "update-request", say: "Status set to Scoring", drawer: 4, status: 1 },
  { line: "score-entries", say: "Score each Shortlist Entry", status: 1, entries: 12 },
  { line: "return-scores", say: "JSON score + rationale comes back", status: 1, entries: 12, gauge: true },
  { line: "update-request", say: "Match Score written to the Shortlist Entry", drawer: 5, status: 1, entries: 12 },
  { line: "score-entries", say: "Score each Shortlist Entry", status: 1, entries: 31 },
  { line: "return-scores", say: "JSON score + rationale comes back", status: 1, entries: 31, gauge: true },
  { line: "update-request", say: "Match Score written to the Shortlist Entry", drawer: 5, status: 1, entries: 31 },
  { line: "score-entries", say: "Score each Shortlist Entry", status: 1, entries: SHORTLIST },
  { line: "return-scores", say: "JSON score + rationale comes back", status: 1, entries: SHORTLIST, gauge: true },
  { line: "update-request", say: "Status set to Building Report", drawer: 4, status: 2, entries: SHORTLIST },
  { line: "copy-template", say: "Copy template per request", status: 2, template: true },
  { line: "return-workbook", say: "Workbook file comes back", status: 2, template: true },
  { line: "fill-rows", say: "Add rows, highest Match Score first · fill summary", status: 2, press: true },
  { line: "write-workbook", say: "Write workbook", status: 2 },
  { line: "send-email", say: "Send report", status: 2, mail: true },
  { line: "deliver-report", say: "Valuation Report (Excel) reaches the User", status: 2, tray: true },
  { line: "update-request", say: "Report link saved · status set to Sent", drawer: 4, status: 3, hold: 3.5 },
];

export const CAPSULE = 14; // world units long
export const SPEED = 92; // world units a second along a line
export const DWELL = 0.55; // seconds a capsule rests at the far end before the next step

export function stepDuration(length) {
  return length / SPEED + DWELL;
}

// The readout's status text for a step. Pure, so the first frame and every later frame agree.
export function statusText(step) {
  const parts = [];
  if (step.status !== undefined) parts.push(STATUSES[step.status]);
  if (step.entries !== undefined) {
    const scored = scoredCount(step.entries);
    parts.push(`${scored} scored${step.entries >= UNSCORED ? ", 1 not scored" : ""}`);
  } else if (step.count !== undefined) {
    parts.push(`${step.count.toLocaleString("en-US")} ${step.count === SHORTLIST ? "on the Shortlist" : "match"}`);
  }
  parts.push(step.say);
  return parts.join(" · ");
}
