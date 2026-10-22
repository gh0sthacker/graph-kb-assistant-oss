# Go KB lexical search slice

## Goal

Add a Go command that can retrieve short, source-backed citations from the
existing Python-compatible local SQLite FTS5 index. This connects the KB to the
Go analysis workflow while preserving the Python index builder as the current
snapshot-construction path.

## Contract

- Open only an existing regular SQLite file outside the source checkout, in
  SQLite read-only mode. Do not create directories, migrate schema, modify the
  FTS index, or fetch source material.
- Resolve the index from `--index`, then `BB_ASSISTANT_KB_INDEX`, then the
  private data root's `kb/index.sqlite3`.
- Require the compatible `kb_meta`, `source_documents`, `chunks`, and
  `chunk_search` tables and a nonempty index with a supported coverage state.
- Search with Python-compatible Unicode tokenization, quoted FTS prefixes, and
  BM25 ranking. Keep query, term, source-family, and result limits explicit.
- Return no more than 100 results and no more than 1,200 Unicode characters of
  excerpt per result. Do not return full source documents.
- Each result preserves chunk/source IDs, source and chunk SHA-256, source
  locator/URL/revision, license and attribution, span, and source metadata.
- Return snapshot ID and source coverage state with every result. A PARTIAL or
  BLOCKED corpus must remain visible in the response.
- Errors must not echo the query or metadata. The command emits bounded JSON.
- This command is not model-facing MCP and does not produce a hypothesis or
  finding.

## Verification contract

Only static development checks are permitted for this slice:

```text
gofmt -d
go build ./...
git diff --check
```

Do not create or run tests, inspect runtime databases, invoke the Caido CLI,
connect to Caido, access targets/network or credentials, or commit.
