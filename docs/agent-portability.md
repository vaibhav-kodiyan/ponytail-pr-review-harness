# Agent Portability

## Rig

### Tier 1 Bootstrap

`sh rig/bootstrap.sh --target /path/to/repo` installs Rig's fixed markdown
payload. It copies the shared router and seven skills, adds native skill copies
for Claude (`.claude/skills`) and Codex (`.agents/skills`), and adds thin
pointers for `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, Cursor, Windsurf, Cline,
Copilot, Kiro, and `.agents/rules` readers. Other hosts can be configured to
read `.rig/routing.md` directly. The bootstrap has no manifest parser, runtime,
key handling, or `.env` behavior; those are outside Tier 1.

Every Rig adapter reads `.rig/routing.md`. See the host entrypoint table in
`README.md` for the installed paths.

## Full Distribution

Rig also ships as a full agent-portable skill distribution. The skills in
`skills/` hold the core behavior; host-specific files are adapters that make
that behavior easy to load in a given agent. The Tier 1 bootstrap does not
install these adapters.

### Supported Adapters

| Host | Files | Notes |
|------|-------|-------|
| Claude Code | `.claude-plugin/plugin.json`, `commands/`, `hooks/claude-codex-hooks.json`, `hooks/` | Full plugin install with session activation, mode tracking, commands, and statusline support. |
| Codex | `.codex-plugin/plugin.json`, `hooks/claude-codex-hooks.json`, `hooks/`, `skills/` | Plugin install with the same skills plus lifecycle hooks for activation and mode tracking. |
| OpenCode | `.opencode/plugins/rig.mjs`, `.opencode/command/`, `hooks/`, `skills/` | Server plugin injects the ruleset each turn via `experimental.chat.system.transform` and persists `/rig` switches; reuses the shared instruction builder. |
| pi | `pi-extension/`, `skills/`, `hooks/` | Package extension: injects the ruleset each turn through the shared instruction builder and registers the `/rig` commands. |
| Hermes Agent | `plugin.yaml`, `__init__.py`, `skills/` | Native Hermes plugin: injects active mode through `pre_llm_call`, rewrites gateway `/rig-*` skill commands into agent prompts, registers `/rig` mode switching, and exposes bundled skills as `rig:<skill>`. |
| Gemini CLI | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | Extension manifest points `contextFileName` at `AGENTS.md` for always-on rules, and reuses the existing `commands/*.toml` and `skills/`, which Gemini CLI auto-discovers. The Claude/Codex hook map is not placed at Gemini's auto-discovered `hooks/hooks.json` path. |
| Cursor | `.cursor/rules/rig.mdc` | Always-on project rule. |
| Windsurf | `.windsurf/rules/rig.md` | Project rule. |
| Cline | `.clinerules/rig.md` | Project rule. |
| GitHub Copilot | `.github/copilot-instructions.md` | Repository instruction file. |
| GitHub Copilot CLI | `.github/plugin/`, `AGENTS.md`, `.github/copilot-instructions.md`, `~/.copilot/copilot-instructions.md` | Plugin-supported (`copilot plugin marketplace add qaynel/Rig` + `copilot plugin install rig@rig`). Fallback instruction mode remains: per-project from `AGENTS.md` or `.github/copilot-instructions.md`, or globally from `~/.copilot/copilot-instructions.md` (instruction-tier, no `/rig` levels or hooks). |
| Antigravity | `AGENTS.md` | Reads `AGENTS.md` at the repo root as always-on rules (like `.cursorrules`/`CLAUDE.md`); `.agents/rules/` also works for workspace rules. Also exposes an MCP config surface; see `project-dev-docs/tier-2-design-docs/basic/basic-design.md` §8. |
| CodeWhale | `AGENTS.md` | Reads `AGENTS.md` from the repo root as project instructions; also reads `CLAUDE.md` and `.claude/instructions.md` as fallbacks. Also exposes an MCP config surface; see `project-dev-docs/tier-2-design-docs/basic/basic-design.md` §8. |
| Swival | `.swival/skills/`, `AGENTS.md` | `swival skills add https://github.com/qaynel/Rig` installs the six skills straight into `.swival/skills/`. Add `--global` to stage them in the library (`~/.config/swival/library`) first, then `swival skills add rig` (or `--global rig`) to activate per-project or everywhere. Also reads `AGENTS.md` from the repo root and `~/.config/swival/AGENTS.md` globally as instruction fallback, and exposes an MCP config surface; see `project-dev-docs/tier-2-design-docs/basic/basic-design.md` §8. |
| VS Code + Codex extension | `AGENTS.md` | The Codex extension reads `AGENTS.md` (repo root, or `~/.codex/AGENTS.md` globally). Instruction-tier; the full Codex plugin row above adds `/rig` levels and hooks. |
| Kiro | `.kiro/steering/rig.md` | Steering rule; copy globally or into a project. |
| OpenClaw | `.openclaw/skills/`, README.es/ko install sections | ClawHub skill package built by `scripts/build-openclaw-skills.js`; `clawhub install rig`. |
| Devin | `.devin-plugin/plugin.json`, README.es/ko install sections | `devin plugins install qaynel/Rig`; skills exposed as `/rig:<skill>`. |
| Generic agents | `AGENTS.md` or `skills/*/SKILL.md` | Copy the compact rule file or load the skill files directly. Instruction-tier, no MCP surface. |

### Adapter Rule

Keep adapters thin. When a host supports skills or hooks, point it at the
existing `skills/` and `hooks/` files. When a host only supports project
instructions, keep its copied rule text aligned with `AGENTS.md`.

### Portable Behavior

- `skills/rig/SKILL.md`: lazy senior dev mode
- `skills/rig-review/SKILL.md`: over-engineering review
- `skills/rig-audit/SKILL.md`: whole-repo over-engineering audit
- `skills/rig-debt/SKILL.md`: harvest `rig:` shortcuts into a tracked ledger
- `skills/rig-gain/SKILL.md`: measured-impact scoreboard from the benchmark
- `skills/rig-help/SKILL.md`: quick reference
- `AGENTS.md`: compact always-on instruction set for agents without skill support
