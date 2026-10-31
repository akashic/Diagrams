# Client Valuation Automation

Helps internal valuation staff find the publicly traded companies most comparable to a private Client, scores how closely each one matches, and delivers the result as an Excel report.

## Parties

**User**:
An internal valuation or advisory staff member who describes a Client and receives the Valuation Report.
_Avoid_: Analyst, requester, customer

**Client**:
The business being valued, described by the User in free text and Search Criteria.
_Avoid_: Client company, client business, target

## Company data

**Listed Company**:
One of the ~40,000 publicly traded companies held in the database, with its sector, industry, country, market cap and description.
_Avoid_: Company result, match, comp, comparable

**Sector**:
A broad economic grouping; every Industry belongs to exactly one Sector.

**Industry**:
A narrower grouping of Listed Companies within a single Sector.

**Market Cap**:
A Listed Company's market capitalization in USD; the valuation figure used for filtering and ranking.
_Avoid_: Valuation (for this figure)

**Market Data Vendor**:
The external third-party source from which Listed Companies are periodically imported.

## Search and scoring

**Search Criteria**:
The User's chosen Sectors, Industries, Countries and Market Cap range that narrow the Listed Companies.
_Avoid_: Filters, metadata, parameters

**Shortlist**:
The ranked set of at most 50 Listed Companies matching the Search Criteria that the User submits for comparison.
_Avoid_: Results, top 50, matches

**Shortlist Entry**:
One Listed Company's place on a Shortlist, carrying its search rank and, once scored, its Match Score; an entry whose scoring failed is "not scored".

**Match Score**:
The AI's percentage similarity between the Client and one Shortlist Entry's Listed Company, with a short rationale.
_Avoid_: Score, rating, similarity

**Valuation Request**:
One User submission (Client description, Search Criteria and Shortlist), tracked from submission through to report delivery.
_Avoid_: Job, run, submission

**Valuation Report**:
The Excel workbook of Match Scores for a Valuation Request, emailed to the User who submitted it.
_Avoid_: Report, output, spreadsheet
