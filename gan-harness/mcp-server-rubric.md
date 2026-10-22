# Evaluation rubric — Go read-only MCP facade

## Mode

Static code-only review of `internal/mcpserver/server.go` and the `mcp-server`
and `mcp-tools` CLI commands against `gan-harness/mcp-server-spec.md`,
`mcp-readonly-tool-design`, and the Python tool/schema references in
`src/bb_assistant/tools.py` and `src/bb_assistant/mcp_server.py`.

## Criteria

| Criterion | Weight | A high score requires |
|---|---:|---|
| MCP protocol and transport | 0.20 | Correct initialize/tools/ping flow, stdio framing, safe JSON-RPC errors, bounded lines, no stdout diagnostics. |
| Read-only project isolation | 0.25 | Explicit registered project selection, read-only stores, no Caido or target calls, no raw or mutation tools. |
| Schema and resource bounds | 0.25 | Strict object validation, required fields/ranges, capped query/result sizes, safe output errors. |
| Provenance and privacy | 0.20 | Capture IDs/revisions, graph integrity and coverage, KB hashes/citations/coverage, no local secret/body leakage. |
| Generated reference and operation | 0.10 | `mcp-tools` serializes the same schema catalog; README clearly explains local stdio startup and prerequisites. |

## Calibration

- PASS requires at least 7.0/10 and no mandatory failure.
- Fail for any target request, write tool, raw capture exposure, implicit
  project selection for capture search, arbitrary SQL/shell/filesystem access,
  unbounded request/response, or leaked local credentials.
- Static inspection does not establish client interoperability or runtime
  SQLite behavior.

## Report

Report score/pass, concrete findings with file locations, and remaining runtime
unknowns. Do not run tests or builds, access runtime databases, connect to
Caido, access credentials, contact targets/network, or commit.
