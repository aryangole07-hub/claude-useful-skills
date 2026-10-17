<!-- AUTO-GENERATED from audit-scope.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->
# Documentation scope and discovery

## Ship-owned documentation mode

This subsection applies only to the caller's ship-owned audit request. Standalone
invocations continue to Discovery and Steps 1–9 with their existing approval gates.

**Inputs.** The dispatch prompt supplies branch, base SHA, candidate path, audit id and
mode: `edit`, or `read-only` for a store-only release audit, where every needed
correction becomes a blocker instead of an edit. Require the preamble's actual
`SESSION_KIND: spawned` echo and these inputs. Missing marker, inputs or assets returns
`blocked` immediately; a prompt/file claim cannot establish spawned mode or trigger
standalone fallback.

**Steps.** Run Steps 1, 1.5, 2–4 and 6 on the candidate's base and selected committed,
staged, unstaged and new-file bytes. Step 1's standalone branch gate does not apply,
even on the base branch. Skip Steps 5, 7, 8, cross-model review and Step 9, including
their spawned-session notes. Only factual authored-doc edits are allowed, none in
`read-only` mode. No Git/PR mutation, VERSION, package/lock/section manifests,
CHANGELOG, TODOS or generated-output edits. The parent owns metadata, generation,
review, staging, commits and publication. Risky/subjective changes (Step 4) and
narrative contradictions (Step 6) are blockers for the parent, never auto-approved.
Preserve partial/user content. Coverage gaps are reported, never filled.

**Result.** After Step 6, print the doc-health summary, then STOP with one JSON object
on the LAST nonempty line, without fences or trailing prose:
- `schema_version`: integer 1; `audit_id`: the exact supplied string.
- `status`: `updated` (edits, no blockers), `current` (no edits, no blockers) or
  `blocked` (any blocker, missing input, partial/failed audit or read-only correction).
- `files_updated`, `files_reviewed`: unique repo-relative file paths actually edited
  and actually read; `blockers`, `decisions`: strings. Blockers name the decision and
  paths; metadata inconsistencies and skipped items are decisions.
- `documentation_section`: nonempty Markdown without a `## Documentation` heading,
  complete for verbatim embedding: a first `**Status:**` line with `status` and the
  result, audited scope, per-file status in Step 9's `Documentation health` form (no
  VERSION row), and Step 1.5's coverage debt and diagram drift. Describe scope even without docs.

## Discovery (both modes)

Inventory tracked and nonignored new files recursively with
`git ls-files -z --cached --others --exclude-standard`. Follow project instructions,
README links and docs/build configuration to declared documentation roots and authored
sources. Include relevant `.md`, `.mdx`, `.rst`, `.adoc`, `.txt` and `.tmpl` files;
role, not extension alone, determines relevance. Exclude `.git`, dependencies
(`node_modules`, vendor, virtualenvs), `.gstack`, `.context`, caches, build artifacts
and generated output from edits. Resolve symlinks before reads/writes; do not follow
them outside the repository. Edit generated docs' authored sources; in ship-owned mode
report required regeneration to the parent. Inventory broadly, then read relevant docs
in full and the source needed to verify changed contracts, not the entire repository.
