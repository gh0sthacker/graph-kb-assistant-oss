# Vendored behavior graph source

`vendor/` contains a vendored Python behavior parser and SQLite graph implementation. The package uses local relative imports; it does not load code from another checkout at runtime. The original source was part of a companion local implementation; its workstation path is intentionally omitted from this public package.

The project-specific changes include package-relative imports, generic private data-root selection, explicit handling for unknown Caido truncation flags, and batched graph imports. `caido_adapter.py` bridges selected Caido exchanges to the graph package and creates redacted, immutable receipts.

## Data boundary

The parser can receive message bytes in memory. Receipts and graph records are intended to contain structural fields, hashes, sizes, and provenance rather than raw request or response values. Text-only source adapters may reconstruct messages and cannot promise original wire fidelity. Store receipts under an operator-controlled private data root.
