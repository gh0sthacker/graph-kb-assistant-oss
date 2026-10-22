# Evaluation rubric — Go resumable Caido history CLI

## Evaluation mode

`code-only`. Review the current `caido-import` orchestration against
`gan-harness/spec.md`, the Go MCP/read-source and ingest contracts, and pinned
Python references `src/bb_assistant/ingest.py`, `src/bb_assistant/storage.py`,
`src/bb_assistant/behavior/caido_adapter.py`, and
`src/bb_assistant/behavior/vendor/importer.py`. Do not create or run tests,
inspect runtime DBs, connect to Caido, read credential values, contact
targets/network, or commit.

## Criteria

| Criterion | Weight | A high score requires |
|---|---:|---|
| Project isolation and read contract | 0.25 | One exact registered project, verified against MCP inventory, no implicit all-project behavior, fixed read-only MCP allowlist, metadata/detail identity and ordering checks. |
| Bounded resources and pagination | 0.20 | Page/body/page-count/delay limits validated before MCP history calls, sequential access, cursor-loop prevention, one-page persistence before cursor movement, safe empty-terminal handling. |
| Capture and graph persistence | 0.25 | Encrypted per-project vault, immutable receipts, one graph batch and capture mapping per page, replay-safe checkpoint advancement, no false atomicity claim. |
| Interruption and resumability | 0.15 | Ctrl-C/SIGTERM interrupts MCP RPC, preserves last committed cursor, partial state for errors/page cap, later invocation resumes the selected project. |
| Privacy and operability | 0.15 | No raw exchanges, cursors, token, or key in output; bounded structural JSON; README gives correct command, defaults, prerequisites, and partial/resume behavior. |

## Score calibration

- 1–3: cross-project write, raw traffic leakage, weak/unprotected vault, or
  checkpoint advanced before data durability.
- 4–5: partial storage path with material replay, integrity, or privacy gaps.
- 6: core happy path exists but notable transaction or file-reuse edge cases
  remain.
- 7: listed criteria appear met; small edge cases remain.
- 8–9: robust recovery, bounded handling, and close Python reference parity.
- 10: exceptional implementation with no known contract gaps.

## Mandatory failure conditions

Fail regardless of score for any implicit all-project import, active/target
requests, raw content or credentials in receipts/logs/output, vault-key
disclosure, project mismatch, unbounded input, checkpoint advancement before
page persistence, mapping a revision to another graph observation, runtime
Caido/DB access during this code-only task, or a false claim of cross-database
atomicity.

## Report format

Report evaluation mode, weighted score, pass/fail against 7.0, concrete
findings with file locations, and remaining unknowns. Do not claim runtime
correctness or parity from compilation alone.
