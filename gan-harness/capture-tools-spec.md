# Go capture detail and bounded raw-read tools

## Goal

Let the assistant inspect one selected Caido exchange from local project data
after structural search, while keeping raw message values out of ordinary
responses.

## Contract

- `bb_get_capture` requires one registered `project_key` and one exact
  `request_id`. Read the historical or live structural row from that project
  only. Return bounded field/header names, endpoint/status metadata, hashes or
  live signatures, graph seed, parser/truncation state, and wire fidelity.
  Never return request/response bytes or values.
- `bb_get_capture_raw` is hidden from `tools/list` by default. Publish and accept
  it only when `BB_ASSISTANT_ALLOW_RAW_CAPTURE_TOOL=1` is set before MCP server
  startup. `mcp-tools` must use the same setting so its generated schema matches
  the runtime catalog.
- Raw read arguments require one registered project key, exact request ID,
  `request` or `response` side, optional nonnegative offset no greater than
  128 MiB, and optional 1–16 KiB maximum range. Default to offset 0 and 8 KiB.
- Only historical captures in the selected project's encrypted vault are
  readable. Do not fetch live-tail data from Caido. Resolve the stored vault
  reference against the expected observation ID/side/digest filename within
  the selected project vault; reject symlinks, non-private/non-regular files,
  oversize files, path changes, absent sides, and inconsistent identities.
- Read the selected side's hash, size, vault reference, and capture metadata
  from the immutable `capture_revisions` row joined by both current revision ID
  and observation ID. Recompute and compare the revision ID before opening the
  vault object; mutable `captures` summary columns do not establish provenance.
- Authenticate the entire AES-256-GCM object with the configured vault key,
  then verify plaintext size and SHA-256 against the selected capture revision
  before returning the requested range. Return full-message SHA-256, revision,
  parser/truncation state, and wire-fidelity metadata. Encode valid UTF-8 as
  text and all other ranges as base64.
- Do not log raw bytes, credentials, local paths, vault key, or message values.
  Return no more than 16 KiB per call. Keep all MCP result sizes within the
  existing 3 MiB cap and use only read-only project stores.

## Verification limits

Only `gofmt -d`, `go build ./...`, and `git diff --check` are permitted. Do not
create/run tests, open runtime databases, connect to Caido/targets/network, read
credentials, or commit. Static review does not establish vault/runtime parity.
