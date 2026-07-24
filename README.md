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

Host selection requires `node` on `PATH`. The default full install remains
POSIX `sh` only.

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

## Install Full Plugin Distribution

Rig also ships richer native adapters for hosts that can load plugins,
extensions, commands, hooks, or statusline integrations. Tier 1 stays the
markdown bootstrap above; use the full distribution when you want the host's
native install surface.

| Host | Install / load path |
|---|---|
| Claude Code | local plugin bundle in `.claude-plugin/` with commands, hooks, and statusline support |
| Codex | local plugin bundle in `.codex-plugin/` with bundled skills and lifecycle hooks |
| OpenCode | load `.opencode/plugins/rig.mjs`; commands live in `.opencode/command/` |
| pi | package extension in `pi-extension/` |
| Gemini CLI | extension manifest in `gemini-extension.json`; commands live in `commands/` |
| GitHub Copilot CLI | `copilot plugin marketplace add qaynel/Rig`, then `copilot plugin install rig@rig` |
| Swival | `swival skills add https://github.com/qaynel/Rig` |
| OpenClaw | `clawhub install rig` |
| Devin | `devin plugins install qaynel/Rig` |

See `docs/agent-portability.md` for the adapter matrix and fallback
instruction-mode paths.

### Hermes Agent

Install Rig as a native Hermes plugin (`plugin.yaml`): it injects the active
mode through `pre_llm_call`, registers `/rig` mode switching, and exposes the
skills as `rig:<skill>`.

## Install Tier 2 (MCP)

Tier 2 "Basic" adds one capability on top of Tier 1: a **credentialed
multi-host MCP configurator**. Declare an MCP server and its credential slots
once, and Rig emits the correct config for every host you selected, writes
`.env.example`, gitignores `.env`, and installs a secret guard so no key reaches
git. It still starts no processes and stores no secret values.

```sh
node rig/materialize.js --target /path/to/repository --manifest rig.config.json
```

Uninstall removes only the MCP files and entries Rig owns:

```sh
node rig/materialize.js --target /path/to/repository --uninstall
```

### Manifest

`rig.config.json` selects hosts and declares MCP servers. Credentials are
**env-var names only** — never values; the validator rejects anything
key-shaped.

```json
{
  "hosts": ["claude", "cursor", "codex"],
  "mcp_servers": [
    {
      "name": "app-db",
      "variants": [
        {
          "id": "stdio",
          "transport": "stdio",
          "credential_safety": "manual_note_required",
          "command": "npx",
          "args": ["-y", "@example/db-mcp"],
          "credentials": ["APP_DB_TOKEN"]
        }
      ]
    }
  ]
}
```

For a remote server use `"transport": "http"` with a `"url"` instead of
`command`/`args`.

### Per-host MCP behavior

Rig emits a native MCP config file for every host that supports one, and a
manual note for the rest. Cursor and GitHub Copilot load the secret from
`.env` / inputs on their own; the other emitting hosts also print a note to wire
the env var.

| Host | Emitted MCP file |
|---|---|
| Claude Code | `.mcp.json` |
| Cursor | `.cursor/mcp.json` |
| Codex / VS Code Codex | `.codex/config.toml` |
| GitHub Copilot | `.vscode/mcp.json` |
| OpenCode | `opencode.json` |
| pi | `.omp/mcp.json` |
| Gemini CLI | `.gemini/settings.json` |
| Kiro | `.kiro/settings/mcp.json` |
| Devin | `.devin/config.json` |
| OpenClaw | `.openclaw/openclaw.json` |
| CodeWhale | `.codewhale/mcp.json` |
| Swival | `.swival/mcp.json` |
| Windsurf, Cline, Hermes, Copilot CLI, Antigravity | note only — no native MCP file |
| `generic` | not supported for MCP |

Per-host token syntax and credential mechanics are documented in
`docs/agent-portability.md` and
`project-dev-docs/tier-2-design-docs/basic/basic-design.md`.

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
has no sync engine, installed runtime, keys, or `.env` handling. Optional
`--hosts` / `RIG_HOSTS` reuses the Tier 2 payload filter (`rig/lib/payload.js`)
at install time so a narrow install matches the materializer; without that flag
the full fixed list remains the oracle. The shared layout is predictable so
Tier 2 (above) describes it without changing the installed shape.

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

For the Tier 2 materializer and the full CI gate (rule copies, version pins, and
the complete Node suite), run:

```sh
npm test
```
