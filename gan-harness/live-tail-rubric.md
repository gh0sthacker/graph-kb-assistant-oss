# Evaluation rubric — one-cycle Go Caido live tail

## Mode

Static review of the `caido-tail` CLI, `internal/ingest` live coordinator and
writer, graph live bundle/source receipt, Caido source usage, and
`gan-harness/live-tail-spec.md`.

## Criteria

| Criterion | Weight | A high score requires |
|---|---:|---|
| Project and source isolation | 0.20 | Exactly one registered project, matching configured Caido instance, read-only source, no silent multi-project selection. |
| Bounded read and deduplication | 0.20 | Fixed time window, bounded pages/body/header/line bytes with a conservative preflight before detail reads, metadata-first flow, existing live/historical IDs skipped before detail reads, cursor and page identity validation. |
| Checkpoint correctness | 0.20 | Same-window resume, cursor advances only after graph and capture-index success, terminal watermark handling, partial state on budget/error, no cursor disclosure. |
| Graph and local storage | 0.20 | Project-keyed signatures, idempotent redacted graph receipts/bundles, atomic local index+checkpoint writes, no live bytes in vault or persistence. |
| Privacy and claims | 0.20 | Owned raw buffers/keys cleared on success and errors, no raw values or IDs in output/logging, clear partial coverage and deferred causal/polling limitations. |

## Calibration

- PASS requires at least 7.0/10 and no P0/P1 finding.
- Fail for raw live-message persistence, cross-project reads, request send/replay,
  cursor advancement before durable page writes, or an unbounded loop/body read.
- Static review does not establish Caido MCP behavior, runtime SQLite parity,
  concurrency behavior, or full history coverage.

## Report

Report score/pass, findings with file locations, and remaining runtime unknowns.
Do not run tests/builds, access runtime databases, connect to Caido, access
credentials, contact targets/network, or commit.
