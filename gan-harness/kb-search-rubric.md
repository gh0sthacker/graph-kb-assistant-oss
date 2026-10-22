# Evaluation rubric — Go KB lexical search

## Mode

Static code-only review of `internal/kb/index.go` and the `kb-search` CLI against
`gan-harness/kb-search-spec.md` and the Python reference
`src/bb_assistant/kb/index.py`. Do not run tests or access a runtime database.

## Criteria

| Criterion | Weight | A high score requires |
|---|---:|---|
| Read-only index handling | 0.25 | Existing file only, source-checkout exclusion, SQLite `mode=ro`, required schema validation, no write or source-fetch path. |
| Bounded input and output | 0.25 | Query/term/filter/top-k limits, excerpt cap, parameterized SQL, bounded metadata decode, no full-document response. |
| Search behavior | 0.25 | Python-compatible tokenization, escaped FTS prefix construction, source filtering, weighted BM25 ordering, empty-query behavior. |
| Provenance and coverage | 0.25 | Stable source/chunk IDs and hashes, locators/attribution and spans, snapshot ID and coverage state, safe errors. |

## Calibration

- PASS requires at least 7.0/10 and no mandatory failure.
- Fail for any write mode, source fetching, unbounded excerpt, raw full-document
  output, SQL/FTS injection, hidden partial coverage, or loss of source hashes.
- Compilation is not runtime or Python parity evidence.

## Report

State score/pass, concrete findings with file locations, and remaining runtime
unknowns. Do not run tests, inspect user runtime data, contact Caido/targets, or
commit.
