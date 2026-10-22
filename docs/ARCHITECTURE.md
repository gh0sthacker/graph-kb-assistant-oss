# Architecture and status

## Components

- **Caido adapters** read history from an explicitly selected project.
- **Ingest and storage** maintain project-scoped capture indexes and a behavior graph.
- **Graph explorer** serves a local read-only UI for endpoints, observations, and links.
- **KB package** builds and queries source-attributed reference snapshots.
- **MCP facade** exposes bounded read-only tools to the selected harness.
- **Python compatibility path** remains available while Go support is expanded.

The model/provider choice is separate from the harness. No real capture data should be sent to a model until its data handling and retention boundary have been reviewed by the operator.

## Current limitations

- Caido history coverage is not yet proven complete; reconciliation reports partial coverage when the source cannot provide a stable snapshot watermark.
- The Go and Python implementations have not been verified as interchangeable against every working database. Do not assume that a Go command migrates or repairs an existing database.
- Several KB providers are source implementations only; their complete source corpus and licensing checks remain in progress.
- Hermes is an optional harness integration. A complete analysis loop that proposes and validates hypotheses is not yet shipped.
- The graph and UI describe captured evidence; they do not establish exploitability or impact.

## Development direction

The product is designed around bounded read access, project isolation, provenance, and explicit coverage gaps. Improvements should keep these constraints visible in interfaces and output rather than treating missing data as complete coverage.
