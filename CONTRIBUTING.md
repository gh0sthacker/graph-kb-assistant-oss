# Contributing

Thanks for considering a contribution. This project is an alpha local application, so please open an issue before starting a large change.

## Ground rules

- Keep all data access scoped to the project explicitly selected by the user.
- Do not add target-side request generation to the application.
- Keep raw traffic, credentials, vault keys, and personal data out of commits, fixtures, logs, and issue reports. Use synthetic or redacted fixtures.
- Keep graph, storage, knowledge-base, MCP, and harness contracts independently testable.
- Preserve source attribution and the original license for vendored material.

## Change workflow

1. Create a focused branch and describe the user-visible behavior or bug.
2. Add or update tests for behavior changes.
3. Run `go test -count=1 ./...` and `go vet ./...`; for Python changes, install
   `.[kb,mcp,test]` and run `python3 -m pytest`.
4. Include the command results and any remaining limitations in the pull request.

Please use the issue templates for bugs and feature requests.
