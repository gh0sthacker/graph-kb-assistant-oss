# Project import status for Codex tools

## Goal

Make `bb_list_projects` useful before search by showing whether each registered
project has a readable Go store, how much local capture/search/graph data is
available, and what coverage remains unknown.

## Contract

- Preserve explicit local registry paging and identity keys. Do not query Caido.
- For each returned project, open its existing project store read-only. If the
  store is missing or incompatible, return `storage_state=unavailable` and a
  generic coverage gap while still returning the registry row.
- Read capture, structural search, live-index, graph-mapping, parse, and sync
  counts from one read-only SQLite snapshot per project. Do not return cursor,
  raw traffic, credentials, request values, or internal filesystem paths.
- Count a capture as graph-mapped only when its mapping revision matches the
  capture's current revision. Read only the Caido historical and live-tail
  checkpoint keys, not an unrelated source row.
- Include the historical and live checkpoint state and update time when
  present; never return cursor or run identifiers.
- Mark coverage `partial`. State that the imported history has no reconciled
  expected total/snapshot token, and that browser UI/JavaScript endpoint
  coverage is absent. Add specific gaps for missing search rows, graph maps,
  incomplete parsing, and unfinished historical imports.
- Do not infer full project coverage from `sync_state=done` or a nonzero count.
- Keep the operation bounded by the existing project-page limit, use safe
  generic errors, and do not mutate project files or SQLite data.

## Verification limits

Only `gofmt -d`, `go build ./...`, and `git diff --check` are permitted. Do not
create/run tests, open runtime databases, contact Caido/targets/network, read
credentials, or commit. Static checks do not prove runtime schema parity.
