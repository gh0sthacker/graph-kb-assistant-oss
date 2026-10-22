# Capability: Caido history into a local behavior graph

## Capability

The operator can inspect the Caido project list, import saved HTTP history
into a private local project store, and inspect request/response relationships
in the graph explorer. This makes their existing Caido traffic useful to the
personal bug-bounty assistant without sending new traffic to a target or
exposing raw captures to a model.

## Constraints

- Keep every project's store, graph, receipts, and capture references isolated.
  The current Python compatibility importer processes every project visible to
  its Caido MCP client; it does not yet have a per-project allowlist. Review
  `--list-only` first and use a Caido workspace containing only the projects
  you intend to import.
- Caido's documented read API is the only capture source. Never read Caido's
  private database or send replay, fuzz, or other active requests.
- Keep historical raw request/response messages only in that project's
  encrypted local vault. Keep the continuous live-tail path shape-only.
- Store runtime data and the vault key outside Git on a private local
  filesystem. Do not store raw captures, credentials, or user data in graph
  labels, logs, receipts, the global KB, or model-visible default tools.
- Preserve request IDs, page cursors, capture revisions, and graph provenance.
  Retry safely; never erase an existing graph before a replacement is
  validated.
- A terminal cursor is `terminal_unreconciled`, not proof of a stable complete
  snapshot. Body completeness and reconstructed-text fidelity are separate
  coverage dimensions.
- The model/provider remains unset. Real capture values do not go to a model
  until its retention and data boundary are explicitly known.

## Implementation contract

### Actors and surfaces

- Operator: reviews the Caido project inventory and starts a bounded import or
  live-tail cycle from the local CLI.
- Caido MCP read bridge: lists projects and reads HTTP history only.
- Local assistant: registers project identity, encrypts historical messages,
  parses exchanges into BehaviorGraph, indexes structural metadata, and serves
  the read-only graph explorer and Hermes MCP facade.
- Graph explorer: shows selected-project requests, endpoints, fields, responses,
  and observed edges with exact Caido request provenance and coverage notes.

### States

`unregistered -> registered -> importing -> partial | terminal_unreconciled`

An interrupted/failed page remains partial and resumes from the last committed
cursor. `terminal_unreconciled` cannot be promoted to complete until a stable
source inventory is independently reconciled. A live-tail run is separately
reported by its watermark/cursor and bounded-page coverage.

### Interfaces and data

- Project identity: stable local Caido instance key + opaque Caido project ID;
  the project name is display metadata only.
- Import input: a stable instance key, page size (1–100), optional bounded page
  count, maximum per-side body size, and page delay. The compatibility path
  enumerates all projects visible to its MCP client.
- Source calls: project listing, project selection, paginated HTTP-history
  metadata, and batched request/response detail reads. The bridge rejects all
  other Caido tool names.
- Import output: per-project run ID, pages and request IDs committed, exchanges
  seen/saved this invocation, cursor state, parse/body/fidelity coverage, and
  sanitized errors.
- Local effects: project registry, SQLite graph/search data, immutable
  encrypted capture objects, and resumable sync receipts. Caido's project
  selection is restored after reads when its API permits.

## Non-goals

- Sending or modifying target requests, active scanning, fuzzing, or replay.
- Merging project graphs across Caido projects.
- Treating imported historical traffic as evidence for a different authorized
  pentest run.
- Sending capture contents to Hermes, a model provider, or a remote service.
- Claiming byte-exact fidelity, stable snapshot completeness, or application
  coverage from history alone.

## Open questions

- Caido MCP exposes a mutable global project selection and no snapshot token;
  concurrent project switching and point-in-time completeness cannot be
  proven. The importer must fail closed on observed selection changes and keep
  coverage unreconciled otherwise.
- Caido's MCP message shape is text. Binary bodies and original HTTP framing
  cannot be recovered from reconstructed text.
- The operator remains responsible for preserving the generated vault key;
  loss of that key makes encrypted historical raw captures unreadable.

## Handoff

- **Implementation:** resumable history import, encrypted local storage, graph
  explorer, and one-cycle live-tail integration. The Python importer currently
  has no per-project allowlist; keep its Caido-visible project list constrained
  to the intended data.
- **Verification:** Go and Python tests exercise the local contracts and
  fixtures. Live Caido imports, compatibility with a user's existing database,
  and the model-backed Hermes scenario must be verified in that user's own
  environment; repository tests do not claim those integrations are complete.
- **Coverage:** `terminal_unreconciled` / `PARTIAL`. Caido exposes no stable
  snapshot token or expected total, so terminal cursor does not verify that
  this import is a complete point-in-time inventory. MCP text reconstruction
  is not byte-exact, oversized bodies may be incomplete, and the full
  model-backed scenario remains unverified because no provider is configured.
- **Runtime:** the graph UI binds to loopback by default. Encrypted captures and
  the vault key belong in a private runtime directory outside Git.
- **Next product step:** add a per-project allowlist to the Python importer so
  operators can exclude projects without changing the Caido workspace.
