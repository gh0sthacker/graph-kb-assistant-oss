# Bug Bounty Graph Assistant — build spec

## Product goal and locked decisions

Build a personal, local-first assistant that turns already-collected HTTP
history from explicitly selected Caido projects into a useful behavior map and
evidence-linked context for a human analyst. This is a coding/data product,
not an autonomous target-testing agent.

- Go is the target implementation language. Python remains the compatibility
  reference and rollback path until parity is established.
- Caido is read only through its documented MCP API. Never read its internal
  database or send requests to target hosts from this project.
- Each Caido project is an isolated namespace. Every write requires the exact
  selected registered project.
- The local graph is a structural projection with provenance. Caido remains
  the canonical raw-traffic archive.
- Do not migrate existing production databases or write runtime data during
  this development slice. No tests, runtime database access, Caido/target
  access, network access, or commits.
- WebSocket, active checks, replay, fuzzing, automatic finding confirmation,
  and a product UI remain outside the first MVP.

## Previously completed slices

1. Read-only project-scoped capture search — ECC PASS in
   `gan-harness/feedback/feedback-001.md`.
2. Read-only bounded BehaviorGraph slice — ECC PASS in
   `gan-harness/feedback/feedback-006.md`.
3. Project-scoped BehaviorGraph batch writer — ECC PASS in
   `gan-harness/feedback/feedback-007.md`.
4. Replay-safe historical page storage — ECC PASS in
   `gan-harness/feedback/feedback-008.md`.
5. Historical page to BehaviorGraph mapping and stable per-record receipts —
   ECC PASS in `gan-harness/feedback/feedback-011.md`.

These reports are static/code-only reviews and do not claim runtime parity.

## Preserved contract: Go BehaviorGraph batch writer

The completed writer remains governed by this contract from its ECC iteration:

- Reusable writer opened only for an explicitly selected registered
  `ProjectStore` and its `BehaviorGraphPath` / `BehaviorReceiptPath`.
- CLI imports one bounded already-redacted v2-format bundle JSON file under an
  exact `--project-key`. It does not accept raw exchanges or contact Caido.
- May create a new v2 BehaviorGraph or write an existing v2 graph; refuses
  symlinks, foreign namespace, malformed/unsupported schema, and v1 writes.
  Does not migrate v1 or modify capture/search database.
- Bundle shape is exactly `schema_version`, `program`, `sources`, `entities`,
  `assertions`, and `cards`; validates schema/project, typed IDs, entity
  invariants, assertion digests, context, card states, declared source refs,
  bounded input, and public metadata. Rejects raw message/header values,
  credentials, secret-like metadata, and promoted findings.
- Normalizes all bundles before writing; merges identical entity IDs only when
  content excluding refs is identical, unions sorted provenance, and rejects
  entity/assertion/card conflicts without overwriting history.
- Every receipt must be a regular resolved file under the selected project's
  `behavior-receipts/` and its SHA-256 must match; verified again before
  commit. Source refs must be declared and every graph record has provenance.
- Graph rows, normalized entity refs, and import identity are written in one
  immediate SQLite transaction. All assertion/card references are validated
  before insertion. Only `supports` and `contradicts` may target assertions.
  Any database or validation failure rolls back the graph transaction.
- Stable bundle identity is `bundle-` plus normalized canonical JSON SHA-256;
  exact replays are idempotent. Provenance/variants deduplicate, distinct
  observations remain distinct. Canonical JSON follows Python semantics.
- Receipt files are immutable and owner-only. Existing same-name receipts may
  be reused only byte-for-byte; an orphan receipt after graph failure is safe
  to reuse. No atomicity is claimed across filesystem and SQLite writes.
- Does not update capture-to-graph revision mappings. Returns only bounded
  structural accounting. Writer is not in the model-facing MCP catalog.
- Static review report: `gan-harness/feedback/feedback-007.md` (8.8/10 PASS).

## Previous generator iteration: bounded historical Caido CLI orchestration

Build the runnable Go `caido-import` command over the established read-only
`caido.ReadSource`, `MCPProcess`, and selected-project `PageWriter` contracts.
The command must perform a resumable, bounded historical import from one
explicitly selected registered Caido project. Implement and compile it without
running it or contacting Caido, target hosts, or the network.

### Builder and project boundary

- Keep the existing pure/reusable exchange-to-bundle builder. It consumes one
  validated exchange, selected project key, and immutable per-record receipt
  ref; it must not access Caido, the network, or another project's database.
  It creates only redacted structural asset/endpoint/observation/card records;
  cards remain incomplete and no hypotheses or findings are asserted.
- Keep a content-addressed page receipt as batch provenance. Graph source refs
  point to separate immutable per-record receipts whose content excludes page
  cursor and ordering, preserving graph identity when a capture revision is
  re-paged. The record locator is `$`.
- Keep `PageWriter.WritePage` ordering: receipt creation and graph import finish
  before checkpoint advancement. Import a page through one bounded graph-writer
  batch, then persist capture-revision mappings in the capture transaction.
  graph import must finish before advancing the capture checkpoint. Import a
  page's bundles through one bounded graph-writer batch. After graph import,
  insert/update `graph_capture_revisions` for every persisted `revision_id` and
  set `graph_capture_map` to the graph observation for the current capture
  revision, in the same capture SQLite page transaction as captures/search and
  before checkpoint advancement.
- Graph DB and capture DB are separate transactions. If graph import succeeds
  but the capture transaction fails, an orphan graph observation is allowed;
  retry must safely reuse the identical graph bundle and then write the
  mapping. Do not claim cross-database atomicity. The durable page cursor must
  never advance until both graph import and capture mapping are complete.
- Preserve the existing 1–100 exchange and 128 MiB raw-page writer limits,
  selected registered project boundary, vault encryption, immutable receipts,
  and replay behavior. Do not return raw traffic or key material.
- `caido-import` requires exactly one registered `--project-key`, verifies that
  the selected identity appears in the configured MCP project list, and uses
  only the pinned MCP v4.3.0 binary and read-only history tools. The binary SHA
  pin remains required; the command never selects every project implicitly.
- Read metadata and matching exchange details sequentially. Verify identities
  and order before writing. Persist each page before advancing its cursor; an
  invocation page cap leaves a resumable `partial` checkpoint. Default to 50
  requests per page, a 512 KiB per-side body limit, and one second between
  pages. Enforce a 64 MiB aggregate body budget before MCP calls, cap each
  message's headers, and bound MCP response-line buffering. A terminal empty
  page completes the run without a fake capture. Ctrl-C/SIGTERM leaves the
  last committed page resumable, stops the current MCP RPC, and restores the
  originally active Caido project through a short cleanup context. If Caido
  returns a body chunk larger than the configured cap, keep only the bounded
  prefix and mark that side truncated.
- Emit only bounded progress: project key, run ID, page counts, stored/replayed/
  revised counts, checkpoint state, and limit status. Never print cursors, raw
  exchanges, the Caido token, or vault key.
- Update README with the command, required local environment values, defaults,
  and resume behavior. Python remains the compatibility/rollback path. Go
  live-tail and the read-only MCP facade are implemented in source; KB snapshot
  building/rebuilding and deployment remain separate work.
- `go build ./...`, `gofmt -d`, and `git diff --check` must succeed. Do not
  create or run tests, inspect runtime DBs, connect to Caido, access credential
  values, contact targets/network, or commit.

## Previous generator iteration: Go lexical KB search

Implement the bounded read-only `kb-search` CLI specified in
`gan-harness/kb-search-spec.md` and evaluated by
`gan-harness/kb-search-rubric.md`. It reads the existing Python-compatible FTS5
index and returns short provenance-bearing excerpts with snapshot coverage. It
does not fetch sources, write or build the index, or expose this command as a
model-facing MCP tool. Go snapshot indexing remains a future slice.

Required static checks are `gofmt -d`, `go build ./...`, and
`git diff --check`. Do not create or run tests, open runtime databases, connect
to Caido, access credentials, contact targets/network, or commit.

## Previous generator iteration: Go read-only MCP facade

The Go `mcp-server` and `mcp-tools` facade serves bounded read-only project
search, BehaviorGraph slices, KB lexical search, KB coverage statistics, and
exact KB source retrieval to Codex. ECC review is in
`gan-harness/feedback/feedback-016.md` (**8.9/10 PASS**). The review found and
verified fixes for route preservation, unsafe source-locator redaction, and
result fingerprinting after redaction. It does not modify global Codex
settings or access Caido directly.

## Previous generator iteration: project import status in Codex

Extend `bb_list_projects` to show local store availability, import/search/graph
counts, parse coverage, checkpoint state, and explicit unknown coverage. Use
`gan-harness/project-status-spec.md` and `gan-harness/project-status-rubric.md`.
Keep the tool read-only and mark overall coverage partial until Caido history
can be reconciled to an expected total; browser UI and JavaScript coverage are
not represented by imported capture data. ECC review is in
`gan-harness/feedback/feedback-018.md` (**9.5/10 PASS**); it verified current-
revision graph mapping counts and exact historical/live checkpoint keys.

## Current generator iteration: bounded project surface map

Add a read-only `bb_surface_map` MCP tool that scans bounded row-ID windows from
one explicitly selected project's existing historical and live structural
indexes. Group each window by host/port/method/route and return page-scoped
observation/parse counts, a bounded union of field/header names, and up to three
current graph seed IDs per endpoint. An endpoint may recur on later pages; the
typed two-source cursor advances over scanned rows. Historical parse state must
be persisted, and graph mappings must match the current revision. Mark the map
partial and disclose that imported history may be incomplete and that browser
UI/JavaScript coverage is absent. Use
`gan-harness/surface-map-spec.md` and `gan-harness/surface-map-rubric.md`.
Never return HTTP message bytes or values, and do not contact Caido or targets.

Required static checks are `gofmt -d`, `go build ./...`, and
`git diff --check`. Do not create or run tests, open runtime databases, connect
to Caido, access credentials, contact targets/network, or commit.

## Current generator iteration: exact capture detail and opt-in raw range

Add `bb_get_capture` for a redacted summary of one exact Caido request ID and
`bb_get_capture_raw` for a bounded historical vault range. The raw tool must be
absent by default and exposed only with explicit
`BB_ASSISTANT_ALLOW_RAW_CAPTURE_TOOL=1`; it must never fetch live-tail content
from Caido. Verify project/request identity, per-project vault path, owner-only
regular-file bounds, AES-GCM authentication, stored size/hash, and no more than
16 KiB returned per call. Return capture revision, truncation and wire-fidelity
metadata; do not log raw data. Apply
`gan-harness/capture-tools-spec.md` and `gan-harness/capture-tools-rubric.md`.

Required static checks are `gofmt -d`, `go build ./...`, and
`git diff --check`. Do not create or run tests, open runtime databases, connect
to Caido, access credentials, contact targets/network, or commit.

## Evaluation mode

`code-only`. Compare implementation and diff with this spec and the pinned
Python sources above. Review deterministic bundle construction, graph/source
IDs, redaction and incomplete status, receipt verification, project isolation,
AES-GCM context, file permissions and immutable reuse, page transaction/
checkpoint ordering, idempotent replay, privacy, and bounded resource use. Compilation does not
establish runtime parity. The coordinator and evaluator must not run tests or
access real project runtime data.
