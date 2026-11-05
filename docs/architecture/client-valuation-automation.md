# Client Valuation Automation

Source description for this system's diagrams. Terms are defined in [`GLOSSARY.md`](../../GLOSSARY.md); the platform decision is [ADR 0001](../adr/0001-build-on-power-platform.md).

## Purpose

A User (internal valuation or advisory staff) describes a private **Client** and narrows ~40,000 **Listed Companies** with **Search Criteria** to a **Shortlist** of at most 50. An AI service gives each Shortlist Entry a **Match Score** (percentage plus rationale) against the Client description. The results are delivered as an Excel **Valuation Report** emailed to the User.

## Logical architecture

| Component | Responsibility |
| --- | --- |
| **Web App** | A form where the User enters the Client description and Search Criteria, sees narrowed options and a live count, runs the search, and submits the Shortlist. It is only a request form, with no request history or status screen. |
| **Search Service** | Three operations over the Company Database: **get options** (remaining values for one filter given the other selections), **count** (Listed Companies matching the current Search Criteria), and **search** (top 50 by Market Cap, largest first). |
| **Company Database** | Listed Companies with reference data (Sector, Industry, Country), plus Valuation Requests and Shortlist Entries. |
| **Orchestrator** | Starts when a Valuation Request is submitted. Moves the request through its statuses, runs scoring, builds the report and sends it. |
| **AI Scoring Service** | Given the Client description, the Search Criteria and one Listed Company's data, returns `{score, rationale}`. |
| **Report Service** | Builds the Valuation Report workbook from a template and returns it to the Orchestrator. |
| **Email Service** | Sends the Valuation Report (attachment) or a failure notice to the User. |
| **Identity Provider** | Authenticates Users with their work accounts. |
| **Market Data Vendor** (external) | The source of Listed Company data, imported monthly. |

Access: Users can read Listed Companies and reference data, and create and read only their own Valuation Requests and Shortlist Entries. The Orchestrator runs under a service identity, so Users never reach the AI, report storage or email services directly.

## Power Platform implementation (as built)

| Logical component | Product |
| --- | --- |
| Web App | Canvas Power App |
| Search Service | Instant Power Automate flows called from the app (get options, count, search). Sector, Industry and Country lists are read directly from Dataverse reference tables. Flows are used because Canvas App delegation limits make distinct values and counts over 40,000 rows impractical in the app. |
| Company Database | Dataverse |
| Orchestrator | Automated Power Automate flow, triggered when a Valuation Request row is added in Dataverse |
| AI Scoring Service | Azure OpenAI (GPT-4-class deployment) via a custom connector |
| Report Service | Template workbook in SharePoint, copied per request and filled with the Excel Online (Business) connector |
| Email Service | Office 365 Outlook connector |
| Identity Provider | Microsoft Entra ID |
| Data import | Dataverse dataflow (Power Query), scheduled monthly from the Market Data Vendor |

Flow connections use a service account. Everything runs in one production environment; the deployment process is out of scope.

## Data model

| Table | Fields and relationships |
| --- | --- |
| **Sector** | name |
| **Industry** | name; lookup → Sector (each Industry belongs to exactly one Sector) |
| **Country** | name |
| **Listed Company** | name, description, Market Cap (USD); lookup → Industry; lookup → Country |
| **Valuation Request** | owner (User), Client description, Search Criteria snapshot (JSON of selected Sectors, Industries, Countries and the Market Cap min/max), status, report link |
| **Shortlist Entry** | lookup → Valuation Request; lookup → Listed Company; search rank; Match Score (%); rationale; scoring status (pending / scored / not scored) |

Each Valuation Request has 1–50 Shortlist Entries. A Listed Company can appear on many Valuation Requests' Shortlists.

## Valuation Request lifecycle

`Submitted → Scoring → Building Report → Sent`, with `Failed` reachable from Submitted, Scoring and Building Report. Searches before submission aren't saved, so there is no Draft status.

- **Submitted**: the app has written the request and its Shortlist Entries.
- **Scoring**: the orchestrator is scoring Shortlist Entries.
- **Building Report**: the workbook is being produced.
- **Sent**: the Valuation Report has been emailed.
- **Failed**: a whole stage failed, and the User was sent a failure email. A single entry failing doesn't fail the request.

## Flow 1: Search

1. The User signs in (Entra ID) and opens the Canvas App.
2. The app loads Sector, Industry and Country lists from Dataverse reference tables.
3. The User enters the Client description.
4. On each selection change (Sectors, Industries, Countries, Market Cap min/max):
   - the app calls the **get options** flow, which queries Dataverse and returns the values still possible in each other filter;
   - the app calls the **count** flow, which returns the number of matching Listed Companies.
   Choosing Sectors narrows Industries, and every selection narrows the rest.
5. The User runs **search**. The flow returns the top 50 matching Listed Companies by Market Cap, largest first.
6. The User either refines the Search Criteria (back to step 4) or submits the whole list as the Shortlist. Partial selection isn't possible, and submit is blocked when zero companies match.

## Flow 2: Scoring and report

1. On submit, the app writes the Valuation Request (status **Submitted**) and one Shortlist Entry per Listed Company to Dataverse.
2. The Dataverse "row added" trigger starts the orchestration flow, which sets status to **Scoring**.
3. A parallel Apply to each loop, one iteration per Shortlist Entry:
   - calls Azure OpenAI through the custom connector with the Client description, the Search Criteria, and the Listed Company's description and metadata;
   - receives JSON `{score, rationale}` and writes it to the Shortlist Entry (scored);
   - retries on failure using built-in retry; if retries are exhausted, marks the entry **not scored** and continues.
4. The flow sets status to **Building Report**, then:
   - copies the template workbook in SharePoint to a per-request file;
   - with Excel Online, adds one table row per Shortlist Entry, sorted by Match Score from highest to lowest. Columns: name, Sector, Industry, Country, Market Cap, Match Score, rationale. Company data is read live through the lookup. Unscored entries are included and marked as such;
   - fills the summary sheet with the Client description and Search Criteria.
5. Outlook emails the workbook as an attachment to the User who submitted the request. The flow saves the report link and sets status to **Sent**.
6. If any stage fails as a whole, the flow sets status to **Failed** and emails the User a failure notice.

## Flow 3: Company data import

A monthly scheduled Dataverse dataflow pulls Listed Company data from the Market Data Vendor and upserts it in place, along with the Sector, Industry and Country reference data.
