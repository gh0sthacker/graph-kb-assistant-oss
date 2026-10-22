# Evaluation rubric — Go capture detail/raw tools

## Mode

Static code-only review of the capture detail/raw readers, MCP handlers and
catalog, CLI catalog generation, and `gan-harness/capture-tools-spec.md`.

## Criteria

| Criterion | Weight | A high score requires |
|---|---:|---|
| Project/request isolation | 0.20 | Exact request ID inside one registered project, read-only store, no cross-project or implicit lookup. |
| Raw opt-in contract | 0.15 | Raw schema absent and calls rejected unless the explicit environment opt-in is enabled before startup; generated schema matches runtime. |
| Vault integrity | 0.25 | Expected project observation identity; selected immutable revision row joined by revision and observation ID; recomputed revision identity; strict filename/path confinement; private regular file checks; AES-GCM authentication; size/hash verification. |
| Output/resource bounds | 0.20 | Maximum 16 KiB response, bounded encrypted-file read, strict side/offset arguments, bounded MCP serialization. |
| Privacy/provenance | 0.20 | No raw values in normal detail, no logging/secrets/path disclosure, full message hash/revision/truncation/fidelity returned for opt-in bytes, live-tail bytes stay in Caido. |

## Calibration

- PASS requires at least 7.0/10 and no P0/P1 finding.
- Fail for default raw exposure, unbounded body output, weak project binding,
  plaintext vault bypass, missing authentication/hash checks, or secret/path
  leakage.
- Static review does not establish runtime SQLite/vault compatibility.

## Report

Report score/pass, findings with file locations, and runtime unknowns. Do not
run tests/builds, inspect runtime databases, connect to Caido, read credentials,
contact targets/network, or commit.
