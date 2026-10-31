# Build Client Valuation Automation on Power Platform

Client Valuation Automation is built on Microsoft Power Platform: a Canvas Power App for the form, Dataverse for Listed Companies and Valuation Requests, Power Automate for search APIs and orchestration, Azure OpenAI for Match Scores, and Excel Online and Outlook connectors for the Valuation Report. We chose it because:

- existing Microsoft 365 and Power Platform licensing kept new cost low;
- the delivery team works low-code;
- it was faster to deliver;
- it stays inside the tenant's existing security, DLP and governance controls;
- it integrates natively with Excel and Outlook, which the report step depends on.

No alternative platform was evaluated. Power Platform was the default choice, given the reasons above.

## Consequences

The design is shaped by Power Platform limits. Canvas App delegation limits over 40,000 Listed Companies are why search runs in Power Automate flows rather than as direct app queries. Moving off the platform would mean rebuilding every component, not swapping one.
