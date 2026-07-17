# Agent Portability

## Tier 1 Bootstrap

`sh rig/bootstrap.sh --target /path/to/repo` installs Rig's fixed markdown
payload. It copies the shared router and seven skills, adds native skill copies
for Claude (`.claude/skills`) and Codex (`.agents/skills`), and adds thin
pointers for `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, Cursor, Windsurf, Cline,
Copilot, Kiro, and `.agents/rules` readers. Other hosts can be configured to
read `.rig/routing.md` directly. The bootstrap has no manifest parser, runtime,
key handling, or `.env` behavior; those are outside Tier 1.

Every Rig adapter reads `.rig/routing.md`. See the host entrypoint table in
`README.md` for the installed paths.
