# Instructions for BB Graph Assistant

This folder is a standalone Git project. Keep its source, configuration, project
instructions, and skills inside this directory. Do not modify parent-workspace
or user-global Codex/Claude/OpenCode settings, and do not add symlinks to their
skills. Keep runtime captures and indexes in a private data root outside source
control.

## Product scope

- Build a bug-bounty analysis assistant, not an autonomous pentest agent.
- The initial product scope is Caido HTTP-history graph, a reproducible,
  source-attributed knowledge base, and reviewed project-local skills.
- Keep Caido projects isolated. Search only the projects explicitly selected by
  the user.
- Use Caido's read API as the primary input. Do not read Caido's internal DB.
- Keep bytes from the separately invoked historical backfill in the
  project-scoped encrypted vault. The continuous live-tail path treats Caido as
  canonical raw storage: parse unseen exchanges in memory, discard the bytes,
  and retain only graph shapes, keyed signatures, and exact Caido references.
  Never place raw traffic or secrets in the global KB, logs, graph labels,
  receipts, or shareable reports.
- Do not send active requests to targets from this project.

## Architecture constraints

- Keep graph, capture, KB, coordinator, and model-provider contracts independent
  of the selected harness.
- Hermes Agent is the selected runtime harness for the assistant. Keep Codex as
  the development environment; selecting Hermes does not replace Codex for
  editing this repository.
- Keep the model/provider decision separate and unset until the user chooses a
  route. Do not start OAuth or configure an unidentified Bridge. Do not send
  real capture data to a model until its retention and data boundary are known.
- Run Hermes from its project-specific profile outside this repository. Expose
  only the allowlisted read-only bb-assistant MCP tools; do not enable Hermes
  terminal, file, browser, web, or code-execution toolsets for the application
  profile.
- Load project skills from the canonical .claude/skills/ directory as an
  external source. Require approval for every Hermes skill write.
- Validate every model-generated tool argument in application code. A model's
  tool call is a request, never authorization.
- Any learned prompts, rules, or skills must be versioned proposals evaluated
  on synthetic or redacted fixtures before adoption.

## Project-local skills

Use the skills in `.claude/skills/` for Caido graph sync, graph-guided
vulnerability analysis, KB source rebuild, harness/provider evaluation, MCP
facade design, and evidence triage. These are project-local instructions and
must not be copied into the parent workspace or global skills registry.

When analyzing a vulnerability hypothesis, follow
`.claude/skills/graph-guided-vulnerability-analysis/SKILL.md`: graph first,
linked captured evidence next, focused KB grounding after that, and a
provenance-backed candidate. The current project does not perform active target
validation.

The pinned RedAmon ToolDocs under `references/redamon/agentic-skills/` are
knowledge-base source material only. Preserve their MIT notice and source
manifest. They are never loaded as executable assistant skills and do not
authorize commands or target requests.
