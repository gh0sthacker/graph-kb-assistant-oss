# Connect Caido

This guide covers the Python compatibility importer. It reads saved Caido
history through the pinned community MCP server. It does not replay requests or
send traffic to targets.

## Before connecting

- Use a Caido MCP server from the pinned `v4.3.0` release of
  [c0tton-fluff/caido-mcp-server](https://github.com/c0tton-fluff/caido-mcp-server/releases/tag/v4.3.0).
  Verify the downloaded binary's SHA-256 against the release metadata or a
  build you verified from that source revision. Do not use an arbitrary
  `@latest` binary.
- The current Python importer enumerates **all projects visible to its MCP
  client**. It has no per-project allowlist. Review the list first and use a
  Caido workspace that contains only the projects you intend to import.
- Choose a private data directory outside the repository. Historical messages
  are encrypted locally; live-tail data and parsing have separate behavior.
  Read [Data handling](DATA-HANDLING.md) before importing real traffic.

## Configure a private environment

Install the Python extras in a virtual environment:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[kb,mcp]'
```

Copy `.env.example` to `.env`, then set these values locally:

- `BB_ASSISTANT_DATA_HOME`: private runtime directory outside this checkout.
- `BB_ASSISTANT_CAIDO_INSTANCE_KEY`: stable local label for this Caido
  installation.
- `BB_ASSISTANT_CAIDO_MCP_COMMAND`: path or executable name for the verified
  MCP binary.
- `BB_ASSISTANT_CAIDO_MCP_SHA256`: its independently verified SHA-256 digest.
- `BB_ASSISTANT_VAULT_KEY`: Base64URL encoding of a random 32-byte key. Keep a
  secure backup; losing it makes encrypted historical captures unreadable.
- Caido authentication: either `CAIDO_ACCESS_TOKEN` or
  `BB_ASSISTANT_CAIDO_TOKEN_FILE` pointing to the private Caido MCP token file.
  The token file must be owned by the current user and have no group/other
  permissions.
- `CAIDO_URL`: Caido MCP endpoint; defaults to `http://127.0.0.1:8080`.

The program does not load `.env` automatically. After editing the ignored file,
export it in the shell that will run the importer:

```sh
set -a
. ./.env
set +a
```

Do not paste real values into issues, logs, screenshots, or commits.

## List, then import

List the projects visible to the configured MCP client before importing:

```sh
python -m bb_assistant.caido_import_cli --list-only
```

The list output includes local project identifiers. Keep it private. If the
visible projects are the ones you intend to import, start with one bounded
page per project:

```sh
python -m bb_assistant.caido_import_cli --page-size 50 --max-pages-per-project 1
```

Review the JSON result and local disk use before continuing. A terminal source
cursor is reported as `terminal_cursor_unreconciled`; it is not proof of a
complete point-in-time snapshot. The database compatibility audit is
read-only and does not migrate an existing store.

## Live-tail

The live-tail command is a separate opt-in path. It reads new exchanges through
the same read-only history bridge and retains a compact graph projection. Start
with a single bounded cycle:

```sh
python -m bb_assistant.caido_tail_cli --once --max-pages-per-cycle 1
```

Do not enable a recurring service until that result, the project scope, and
local disk behavior have been reviewed.
