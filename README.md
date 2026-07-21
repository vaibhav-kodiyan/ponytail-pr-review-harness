<figure>
<img width="1012" height="506" alt="image" src="https://github.com/user-attachments/assets/c647015e-6538-43de-8c26-6d6358c89729" />
<figcaption>
  Photo by <a href="https://unsplash.com/@luandmario?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Maria Lupan</a> on <a href="https://unsplash.com/photos/red-and-black-metal-tower-during-sunset-hy97yy3e03A?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
</figcaption>
</figure>

---
Rig is a curated, host-agnostic toolbox for coding agents. Tier 1 installs a
markdown-only workflow into any repository: one shared router, an always-on
Ponytail implementation rule, and focused skills for intent, design, execution,
TDD, debugging, and code review.

It starts no processes, needs no API keys, and installs no dependencies.

## Install Tier 1

From this checkout:

```sh
sh rig/bootstrap.sh --target /path/to/repository
```

Tier 1 currently installs from a local Rig checkout. The pinned release/git-ref
bootstrap path described in the foundational design is not shipped yet.

The bootstrap prompts for the tier when run interactively. Automation can make
the same choice explicitly:

```sh
sh rig/bootstrap.sh --tier 1 --target /path/to/repository
```

Narrow the install to selected hosts (same gating as the Tier 2 materializer):

```sh
sh rig/bootstrap.sh --tier 1 --target /path/to/repository --hosts antigravity,codex
# or: RIG_HOSTS=antigravity,codex sh rig/bootstrap.sh --tier 1 --target /path/to/repository
```

Tier 1 installs the same instruction set for these host entrypoints:

- Claude Code gets project skills in `.claude/skills/` and a router pointer in
  `CLAUDE.md`.
- Codex gets native project skills in `.agents/skills/` plus the always-on
  router pointer in `AGENTS.md`.
- Antigravity co-reads that same `.agents/` skills/rules tree, plus `GEMINI.md`
  (Antigravity-specific overrides win over `AGENTS.md`) and slash-command
  workflows under `.agents/workflows/`.
- OpenCode, CodeWhale, Swival, and other `AGENTS.md` readers get a root pointer.
- Gemini CLI gets a `GEMINI.md` pointer.
- Cursor, Windsurf, Cline, GitHub Copilot, Kiro, and `.agents/rules` readers get
  their native project instruction files.

Every adapter reads `.rig/routing.md`. Claude and Codex also discover the same
seven skills natively from their host directories. Existing host entrypoints
are preserved.

Those native skill trees are committed in this repository at `.claude/skills/`
and `.agents/skills/`; the bootstrap copies them unchanged into target repos.

| Host | Installed entrypoint |
|---|---|
| Claude Code | `CLAUDE.md`, `.claude/skills/rig-*/SKILL.md` |
| Cursor | `.cursor/rules/rig.mdc` |
| Windsurf | `.windsurf/rules/rig.md` |
| Cline | `.clinerules/rig.md` |
| GitHub Copilot editor/CLI | `.github/copilot-instructions.md`, `AGENTS.md` |
| Codex / VS Code Codex | `AGENTS.md`, `.agents/skills/rig-*/SKILL.md` |
| Gemini CLI | `GEMINI.md` |
| Antigravity | `AGENTS.md`, `GEMINI.md`, `.agents/rules/rig.md`, `.agents/skills/rig-*/SKILL.md`, `.agents/workflows/` |
| Kiro | `.kiro/steering/rig.md` |
| OpenCode, CodeWhale, Swival | `AGENTS.md` |
| Other agents | Configure the host to read `.rig/routing.md`, or add the one-line pointer from `rig/tier-1/adapters/pointer.md` to its project instructions. |

## Curation Spine

| Phase | Rig owner |
|---|---|
| Intent and acceptance tests | Grilling |
| Product and technical design | Product design |
| Implementation | Ponytail |
| Execution and parallelism | Execution |
| TDD | Curated graft |
| Debugging | Curated graft |
| Code review | Curated graft |

The curated skills label their checks by workflow phase. They merge the
distinctive parts of each workflow instead of concatenating source documents.

## Tier 1 Boundary

Tier 1 is intentionally a dumb bootstrap with a fixed file list by default. It
has no sync engine, runtime, keys, or `.env` handling. Optional `--hosts` /
`RIG_HOSTS` reuses the Tier 2 payload filter (`rig/lib/payload.js`) so a narrow
install matches the materializer; without that flag the full fixed list remains
the oracle. The shared layout is predictable so a future Tier 2 can describe it
without changing the installed shape.

The workflow is advisory because Tier 1 ships markdown only. Claude and other
hook-capable hosts can provide real tool-boundary enforcement in a later tier;
Cursor cannot. Rig states that limitation instead of claiming prose is a hard
guardrail.

## Verify

```sh
npm run test:rig
```

The test bootstraps a fresh temporary repository and checks the complete shared
payload, every instruction adapter, preservation of existing host files, the
markdown-only boundary, and absence of secret placeholders.
