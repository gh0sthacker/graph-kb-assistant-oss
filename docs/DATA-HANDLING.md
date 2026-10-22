# Data handling

The operator owns the Caido workspace and the local data directory. Keep both private. Never commit raw captures, session values, credentials, vault keys, or derived indexes.

- **Selected project boundary:** adapters operate only on project identifiers supplied by the operator.
- **Historical import:** imported bytes can be retained in the project-scoped encrypted vault, depending on the selected path and configuration.
- **Live-tail:** the Go path parses newly read exchange bytes in memory and retains graph structure, keyed signatures, and Caido references; it does not place raw live exchanges in the local vault.
- **Knowledge base:** source documents are reference material and must retain source attribution and license notices. Never add target traffic or secrets to the shared KB.
- **Model boundary:** model/provider integrations are separate from data storage. Do not send real capture data to a model until retention and processing terms are understood.

These behaviors differ between implementations and may change while the project is in alpha. Check the code and current command documentation before using a real project. A `PARTIAL` result means the displayed records are not a complete snapshot.
