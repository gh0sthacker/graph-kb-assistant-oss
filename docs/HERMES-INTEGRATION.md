# Hermes Agent integration

Hermes Agent is the selected runtime harness for the personal assistant.
Codex remains the development environment for this repository. The graph,
capture store, KB, coordinator, and MCP contracts stay independent of Hermes.

## Install and launch

From the repository root:

    ./scripts/install-hermes
    ./scripts/run-hermes

The install helper downloads the official Hermes installer from the immutable
`v0.22.3` release tag, checks its SHA-256 before execution, and asks it to
install the corresponding exact commit. It keeps the Hermes source, profile,
and installer bootstrap home outside this Git checkout. It also installs
without browser or computer-use dependencies and does not edit the real user's
shell startup files. To upgrade the pin, review an official Hermes release and
update the tag, commit, and installer checksum together in
`scripts/install-hermes`. Run the following to choose a model provider later:

    ./scripts/run-hermes model

The selected provider and model are not part of the harness decision. Until
configured, Hermes can be checked for installation and local MCP connectivity,
but it cannot answer model-backed chat requests.

The graph explorer is a separate local web UI. In another terminal, run:

    go run ./cmd/bb-assistant web-ui

Then open http://127.0.0.1:8765/. Hermes chat itself runs in its CLI interface.

The default private runtime root follows the Go app's data-root rules:
BB_ASSISTANT_DATA_HOME, then XDG_DATA_HOME/bb-graph-assistant, otherwise
~/.local/share/bb-graph-assistant. Set BB_ASSISTANT_HERMES_HOME or
BB_ASSISTANT_HERMES_INSTALL_DIR to override the Hermes-specific paths. Runtime
state remains outside source control.

## App profile

scripts/setup-hermes generates a profile under the private runtime root. It
refuses to overwrite a config.yaml that it did not create. The profile:

- Connects only to the local bb-assistant stdio MCP server.
- Allows bb_list_projects, bb_search_captures, bb_surface_map,
  bb_graph_slice, bb_kb_stats, bb_kb_search, bb_kb_get_source, and
  bb_get_capture.
- Disables MCP resources and prompts; raw capture reads are absent.
- Marks the MCP server untrusted and disables parallel tool calls.
- Enables the Hermes MCP toolset, skills, and clarify only. Hermes terminal,
  file, browser, web, computer-use, and code-execution toolsets are omitted.
- Reads canonical skills from .claude/skills/ and requires approval for
  skill writes.

The app MCP server reads local registered project stores and the local KB. It
does not connect to Caido, send target traffic, mutate a project, or expose
raw request/response values. The server's schemas remain the source of truth;
see [ASSISTANT-TOOLS.md](ASSISTANT-TOOLS.md).

Hermes skills are instructions, not authorization. A tool call still passes
through the Go coordinator's project selection and schema bounds. The model
provider's data handling has not been reviewed, so do not use real capture
content in model conversations until that route is selected and reviewed.

## Checks

Local MCP tool schemas:

    go run ./cmd/bb-assistant mcp-tools

Run the project tests and Go checks:

    go test ./...
    go vet ./...

Hermes MCP smoke test after installation:

    ./scripts/run-hermes mcp test bb_assistant

If the Hermes CLI version changes its MCP test command, inspect
./scripts/run-hermes mcp --help and update this runbook. Then run the synthetic
workflow described in [ARCHITECTURE.md](ARCHITECTURE.md). The smoke test
must report exactly the eight allowlisted tools before the harness is treated
as connected.

The public repository contains no personal Caido projects, capture records, or
private runtime receipts. Local test results verify the code and fixtures, but
they do not prove that a given user's Caido instance has been fully imported or
reconciled. Treat live integration coverage as `PARTIAL` until it has been
checked against that user's selected project and current database.

## Official references

- [Installation](https://hermes-agent.nousresearch.com/docs/getting-started/installation)
- [MCP configuration](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference)
- [Toolsets](https://hermes-agent.nousresearch.com/docs/reference/toolsets-reference)
- [Skills and write approvals](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [CLI commands](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)
