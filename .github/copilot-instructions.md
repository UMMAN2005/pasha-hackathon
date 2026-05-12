Purpose

Quick, repository-specific guidance for Copilot/agent sessions working in this APM workspace.

Build, test, and lint commands

- No top-level build/test/lint scripts detected. apm.yml "scripts" is empty.
- Dependency sync (inferred): `apm install` from the repo root to populate apm_modules.
- If a CI or test harness is added, list the exact CLI invocations in apm.yml/scripts so Copilot can run them.

High-level architecture

- APM workspace: apm.yml is the manifest. Dependencies are vendored into apm_modules/.
- Agent configs: .claude/ holds agent and command definitions and settings (.claude/agents/, .claude/commands/, .claude/settings.json).
- Gemini skills/commands: .gemini/ contains skills and TOML command definitions used by Gemini tooling.
- GitHub-facing skills: .github/skills/ contains published SKILL.md bundles and any skill-specific assets/scripts.
- Third-party modules: apm_modules/ are vendor packages; treat as read-only unless intentionally forking/updating.

Key conventions and repo-specific rules

- Contributor/agent policy (see apm_modules/obra/superpowers/CLAUDE.md):
  - Do not open PRs without a human partner reviewing the full diff and filling .github/PULL_REQUEST_TEMPLATE.md.
  - Always search open and closed PRs for duplicates before proposing changes; reference findings in the PR template.
  - One problem per PR. No bundled unrelated changes.
  - Skill changes require evaluation evidence; new harness integrations require a session transcript proving end-to-end behavior (see CLAUDE.md for the acceptance test).
- Where to add stuff:
  - Add new agents as .md files under .claude/agents/.
  - Add new commands to .claude/commands/ (Claude) or .gemini/commands/ (Gemini).
  - Add new skills under .gemini/skills/ or .github/skills/ (follow existing SKILL.md structure).
- Vendor edits: avoid editing files inside apm_modules/ unless contributing upstream; prefer publishing a separate plugin.
- Bootstrapping: integrations must load the "using-superpowers" bootstrap at session start for skills to auto-trigger.

Existing AI-assistant configs to consult

- apm_modules/*/CLAUDE.md (notably apm_modules/obra/superpowers/CLAUDE.md)
- GEMINI.md (top-level) — project overview and hook descriptions
- .github/skills/*/SKILL.md — skill metadata and local run scripts
- apm.yml and .claude/settings.json — primary manifest and hook settings

Notes for Copilot sessions

- Before offering code changes, validate: (1) the PR template is fillable with specific answers, (2) there are no duplicate PRs, (3) a human has approved the complete diff.
- For proposed skill or integration changes, provide evaluation evidence and transcripts as described in CLAUDE.md.

Questions

Would you like me to configure any MCP servers (e.g., Playwright) for this project? If yes, specify which services to configure.