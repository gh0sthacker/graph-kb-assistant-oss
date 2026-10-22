# Bounded project surface map for Codex

## Goal

Give the assistant a browsable, evidence-linked view of structural HTTP
observations already present in one selected local project, with a fixed upper
bound on rows read per call.

## Contract

- Expose a read-only MCP tool `bb_surface_map` for exactly one registered
  `project_key`. Open only its existing Go project store read-only.
- Scan at most `limit + 1` rows from each of the historical structural search
  table and live structural index, ordered by SQLite row ID. `limit` is 1–40.
  Use a typed two-part row-ID cursor for continuation; do not count or sort the
  entire project to build one response.
- Suppress a live row when its Caido instance/project/request ID already exists
  in historical captures. The membership checks are bounded by the live rows
  selected for this page.
- Group rows found in this scan window by host/port/method/route. Return counts
  for this page only, at most 50 field names and 50 header names per endpoint,
  and at most three current graph seed IDs. A valid graph seed is exactly an
  `observation-<64 lowercase hex>` ID; other typed graph entity IDs do not count
  as observation mappings. An endpoint may appear on multiple pages. Expose
  the page-scoped count and sampled-field semantics in the response.
- Persist the historical projection's `complete`/`partial` parse state on the
  capture row. Historical graph mappings count only when they match the
  capture's current revision; live seed IDs come only from their live index row.
- Mark overall coverage `partial` and disclose that the bounded page does not
  reconcile total Caido history, and that browser UI/JavaScript coverage is
  absent. A scan cap or continuation cursor must never be described as complete
  endpoint coverage.
- Never return request/response bytes or values, credentials, arbitrary SQL,
  local receipt paths, or target operations. Do not call Caido.
- Keep SQL read-only, parameterized, and bounded by indexed row-ID keysets.
  Use one SQLite read snapshot for history rows, live rows, deduplication, and
  graph mapping.

## Verification limits

Only `gofmt -d`, `go build ./...`, and `git diff --check` are permitted. Do not
create/run tests, open runtime databases, contact Caido/targets/network, read
credentials, or commit. Static checks do not prove runtime schema parity.
