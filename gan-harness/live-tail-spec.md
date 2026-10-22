# One-cycle Go Caido live tail

## Goal

Add a bounded Go command that indexes recent HTTP exchanges from one explicitly
selected Caido project while leaving live request/response bytes in Caido.

## Contract

- Expose `bb-assistant caido-tail` for exactly one registered `project_key`.
  Verify that the selected project is exposed by the configured read-only
  Caido MCP source. Never select a project by display name or silently process
  every project.
- This first slice runs one bounded cycle and exits. Defaults: page size 50,
  maximum one page per invocation, 90 seconds of overlap, and 256 KiB maximum
  request/response bytes per exchange. Enforce page size 1–100, page budget
  1–100, overlap 1–3600 seconds, and body limit 64 KiB–16 MiB.
- Limit aggregate serialized request plus response messages in one page to 64
  MiB. Before fetching details, reject a CLI page-size/body-limit combination
  whose worst-case includes two 128 KiB header blocks and two 8 KiB first lines
  per exchange, as well as both body limits.
- Resume the exact persisted `window_since`, `window_until`, and metadata
  cursor while state is `running` or `partial`. Otherwise create a fixed UTC
  interval from `watermark - overlap` (or `now - overlap` before the first
  completed cycle) through one captured `now`. Query only
  `req.created_at.gt:"..." AND req.created_at.lt:"..."`.
- Read metadata first. Reject duplicate request IDs and invalid/non-advancing
  cursors. Before fetching message details, skip IDs already in either the
  selected project's `live_capture_index` or historical `captures`. Validate
  that fetched details exactly match the remaining metadata rows and that page
  cursors agree.
- Build project-keyed HMAC request/response signatures and URL keys in memory;
  persist only redacted structural projection, hashed keys, graph observation
  IDs, and a source receipt with safe metadata. Never copy live raw bytes into
  the vault, SQLite, graph, logs, or command output. Clear temporary message and
  key buffers after each page and on every error path. Clear serialized body,
  HMAC, JSON-RPC, and header-conversion byte copies as soon as they are
  consumed. Go's immutable MCP payload and normalized-URL strings cannot be
  reliably zeroed; drop their references after each detail batch and do not
  retain them in application state.
- Import one bounded graph batch idempotently, then atomically write its live
  index/FTS rows and advance the local checkpoint. If the graph import succeeds
  but the capture transaction fails, replay of the same page must be safe. A
  cursor advances only after both graph import and index/checkpoint commit.
- A terminal page moves `watermark` to the fixed `window_until` and clears the
  window/cursor. A page-budget stop or error keeps the same window and last
  durable cursor with state `partial`; the next invocation resumes it. Never
  expose the raw cursor or request IDs in output.
- Output only project key, state, requests seen/added, pages completed,
  watermark, whether a cursor remains, and whether the invocation page budget
  was reached. `partial` is not complete history coverage.
- This first slice does not create referrer/redirect causal edges, poll on a
  timer, or claim a stable Caido history watermark. Report those gaps.
- Never replay, send, mutate, or fuzz target requests. Do not access Caido's
  private database.

## Verification limits

Only `gofmt -d`, `go build ./...`, and `git diff --check` are permitted. Do not
create/run tests, open runtime databases, connect to Caido/targets/network, read
credentials, or commit. Static checks do not establish source or schema parity.
