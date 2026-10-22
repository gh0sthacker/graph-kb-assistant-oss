# Evaluation rubric — `bb_surface_map`

## Mode

Static code-only review of `internal/search/surface.go`, historical parse-state
storage, the `bb_surface_map` handler/schema, and `gan-harness/surface-map-spec.md`.

## Criteria

| Criterion | Weight | A high score requires |
|---|---:|---|
| Project isolation/read-only snapshot | 0.20 | Exactly one registered project, read-only store, one consistent SQLite snapshot, parameterized queries. |
| Bounded query work | 0.25 | Indexed row-ID scans with strict per-source row limits; no full-table counts, grouping, or windowing before limits. |
| Inventory semantics | 0.20 | Historical/live dedup by exact project/request identity, historical current-revision graph mapping, only exact `observation-<64 lowercase hex>` graph IDs counted, persisted parse state, accurate page-scoped counts. |
| Coverage and continuation | 0.20 | Typed keyset cursor advances only over scanned rows; continuation/truncation is explicit; page counts and sampled fields cannot be mistaken for project totals. |
| Privacy and output bounds | 0.15 | No raw values or local paths; bounded field/header names and graph seeds; stable, understandable MCP description/schema. |

## Calibration

- PASS requires at least 7.0/10 and no P0/P1 finding.
- Fail for unbounded aggregate/window work, stale graph revision mapping,
  missing parse state, duplicate historical/live observations, or misleading
  total-coverage claims.
- Static inspection does not establish runtime SQLite behavior or query plans.

## Report

Report score/pass, concrete findings with file locations, and remaining runtime
unknowns. Do not run tests or builds, access runtime databases, connect to
Caido, access credentials, contact targets/network, or commit.
