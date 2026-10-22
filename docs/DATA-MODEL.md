# Data model overview

The application stores a project-scoped representation of captured HTTP behavior. A project key isolates records from other selected Caido projects.

Core record groups:

- **Project identity:** stable local namespace derived from the selected source project.
- **Capture records:** source identifiers, timestamps when available, status, sizes, and parse completeness.
- **Behavior graph:** endpoints, request/response variants, observations, parameters, and typed relationships.
- **Provenance:** references from graph observations to local receipts or source request IDs.
- **Knowledge base:** versioned source documents and chunks with attribution and content hashes.

The graph is an evidence index, not a claim of causal execution or vulnerability impact. Missing timestamps, truncated messages, incomplete sync, or reconstructed source data remain explicit limitations. The Go and Python stores have separate schemas and are not assumed to be interchangeable.
