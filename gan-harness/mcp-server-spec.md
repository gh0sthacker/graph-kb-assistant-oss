# Go read-only MCP facade

## Goal

Expose the Go coordinator through a stdio MCP server that Codex can launch as a
local subprocess. The model gets bounded local read tools for project discovery,
capture search and detail, BehaviorGraph slices, and KB retrieval.

## Contract

- Use newline-delimited JSON-RPC over stdin/stdout. Keep diagnostics off stdout,
  cap one request line at 1 MiB, and cap one serialized tool result at 3 MiB.
- Support MCP initialize, initialized notification, ping, tools/list, and
  tools/call. Advertise only the supported protocol capabilities.
- Tool schemas are the source of truth and are returned by `mcp-tools` for a
  generated reference. Every tool is explicitly annotated `readOnlyHint=true`
  and `openWorldHint=false`.
- Always expose `bb_list_projects`, `bb_surface_map`, `bb_search_captures`,
  `bb_get_capture`, `bb_graph_slice`, `bb_kb_stats`, `bb_kb_search`, and
  `bb_kb_get_source`.
- Expose `bb_get_capture_raw` only when the local operator has set
  `BB_ASSISTANT_ALLOW_RAW_CAPTURE_TOOL=1` before server startup. It reads one
  exact historical request/response side and at most 16 KiB from the selected
  project's encrypted local vault after authenticating the stored object. It
  never fetches live-tail bytes from Caido. `mcp-tools` must use the same
  opt-in setting when generating the catalog.
- Project operations use only the local registered catalog. Every capture
  search requires 1–20 explicit registered project keys; graph and detail reads
  require one exact registered key. Open project stores read-only.
- Validate tool arguments against strict object schemas and enforce bounds in
  handlers. Unknown keys, duplicate project selections/seeds, and invalid
  ranges fail with safe errors.
- `bb_kb_stats` returns the active snapshot identity, source-family/document/
  chunk counts, and source coverage while preserving `PARTIAL`, `BLOCKED`, and
  `unverified` states. `bb_kb_get_source` requires an exact source family and
  source ID and returns at most 30,000 text characters (12,000 by default),
  provenance, a truncation flag, and whether the complete content hash was
  verified. Neither tool fetches or modifies sources.
- Search results and `bb_get_capture` contain structural metadata and
  provenance only. Graph slices preserve integrity and source refs without
  local filesystem paths or unsafe locators, while retaining endpoint routes,
  truncation, incomplete state, and coverage limits. KB excerpts preserve
  hashes, citations, and snapshot coverage; mark retrieved content as untrusted
  reference material.
- `bb_surface_map` scans bounded row-ID windows from one project's local
  structural indexes. Counts and fields are page-scoped, endpoints may recur on
  later pages, and Caido history may be incomplete; browser/JavaScript coverage
  is absent.
- When enabled, `bb_get_capture_raw` requires one selected project key, exact
  request ID, side, bounded byte offset, and maximum range of 16 KiB. Include
  revision, hash, size, truncation, and wire-fidelity provenance; do not log
  returned bytes. Raw values may include credentials or personal data.
- Never expose sync/write operations, arbitrary SQL, shell, filesystem
  operations, Caido MCP tools, target send/replay/fuzz, hypotheses, or finding
  promotion.
- A missing local KB index disables only `bb_kb_stats`, `bb_kb_search`, and
  `bb_kb_get_source`; the server remains available for project and graph
  operations.
- No runtime configuration is written by the server. Startup reads the local
  project registry and validates the optional KB index; selected project data
  is opened read-only only for the corresponding tool call.

## Verification contract

Only static development checks are permitted:

```text
gofmt -d
go build ./...
git diff --check
```

Do not create or run tests, open runtime databases, connect to Caido, access
credentials, contact targets/network, or commit.
