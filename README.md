# BB Graph Assistant

A local-first assistant for exploring project-scoped HTTP history, browsing a behavior graph, and searching a source-attributed knowledge base. The repository includes a Go implementation, a Python compatibility path, a local web graph viewer, and read-only MCP interfaces for agent harnesses.

> **Project status: alpha.** Caido synchronization and compatibility with existing user databases are still being validated. Some imports and knowledge-base providers are intentionally marked partial. See [Architecture and status](docs/ARCHITECTURE.md).

## What it does

- Builds a project-scoped graph from selected Caido HTTP history.
- Shows endpoints, observations, request/response variants, and their links in a local read-only web UI.
- Provides bounded search and graph-slice commands and read-only MCP tools.
- Keeps historical capture storage and indexes in a configurable local data root outside the source checkout.
- Includes a source-attributed KB ingestion and search path.

The assistant is for understanding captured application behavior and organizing hypotheses. It does not send requests to targets or label a hypothesis as a verified vulnerability.

## Quick start

Requirements: Go 1.27 or newer.

```sh
git clone https://github.com/gh0sthacker/graph-kb-assistant-oss.git
cd graph-kb-assistant-oss
./setup.sh
./bin/bb-assistant web-ui
```

Open <http://127.0.0.1:8765/>. The viewer is read-only and only shows projects already registered in its local data root; a new installation can start with an empty project list. Use `--data-root /path/to/private/data` when running the CLI if you want to select a separate data directory.

The Go viewer does not import Caido history by itself. The Python compatibility
path contains the Caido importer. Follow the [Caido setup guide](docs/CAIDO-SETUP.md)
and [data handling](docs/DATA-HANDLING.md) before connecting a real project.

Python tools are available for compatibility and selected KB/MCP workflows (Python 3.12+):

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[kb,mcp,test]'
```

`.env.example` documents optional settings. The application does not load dotenv
files automatically. If you copy it to the ignored `.env` file, review it and
export its values in your shell before running a command, for example with
`set -a; . ./.env; set +a`. Keep real values out of Git.

The Go and Python paths are not yet proven interchangeable against every existing database. Review the limitations before importing or migrating data.

## Data and privacy

Keep Caido credentials, local capture databases, vault keys, raw captures, and generated indexes outside Git. The project `.gitignore` excludes the standard local data directories and database/vault formats. Historical imports and live-tail have different storage behavior; read [Data handling](docs/DATA-HANDLING.md) before connecting a real project.

## Development

```sh
go test -count=1 ./...
go vet ./...
python3 -m pip install -e '.[kb,mcp,test]'
python3 -m pytest
```

Contributions should include focused tests and preserve the project-scoped, read-only integration boundaries. See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

## Third-party material

The KB source bundle under `references/redamon/agentic-skills/` is pinned from [RedAmon](https://github.com/samugit83/redamon) and distributed under its included MIT license and source manifest. Its contents are reference documents, not executable instructions.

## License

The project code is licensed under the [MIT License](LICENSE). Vendored
third-party material keeps its own license and attribution; see
[`references/redamon/`](references/redamon/).
