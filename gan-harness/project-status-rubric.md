# Evaluation rubric — Codex project import status

## Mode

Static review of `internal/search/project_status.go` and the `bb_list_projects`
handler in `internal/mcpserver/server.go` against
`gan-harness/project-status-spec.md` and the project store schema.

## Criteria

| Criterion | Weight | A high score requires |
|---|---:|---|
| Project isolation and read-only behavior | 0.25 | Exact registered project identities; no Caido/network calls; stores remain read-only. |
| Status accuracy | 0.30 | Counts and parse/sync state are read coherently and accurately; no completion claim from a cursor alone. |
| Coverage gaps | 0.20 | Missing DB/search/graph/parse/import states are explicit; browser and JS coverage stay unknown. |
| Privacy | 0.15 | No cursor, raw traffic, secrets, local paths, or run IDs in tool output. |
| Bounds and resilience | 0.10 | Project page bound remains enforced; unavailable stores do not hide registry rows; errors are safe. |

## Calibration

PASS requires at least 7.0/10 and no P0/P1 finding. Fail for a write, Caido or
target request, unbounded output, raw traffic/secret/cursor disclosure, or any
claim that local sync state proves complete history coverage.

Do not run tests/build, open runtime databases, connect to Caido, access
credentials, contact targets/network, or commit.
