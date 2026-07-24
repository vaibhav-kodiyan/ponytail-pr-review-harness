---
name: rig-help
description: >
  Quick-reference card for all rig modes, skills, and commands.
  One-shot display, not a persistent mode. Trigger: /rig-help,
  "rig help", "what rig commands", "how do I use rig".
---

# Rig Help

Display this reference card when invoked. One-shot, do NOT change mode,
write flag files, or persist anything.

## Levels

| Level | Trigger | What change |
|-------|---------|-------------|
| **Lite** | `/rig lite` | Build what's asked, name the lazier alternative in one line. |
| **Full** | `/rig` | The ladder enforced: YAGNI → stdlib → native → one line → minimum. Default. |
| **Ultra** | `/rig ultra` | YAGNI extremist. Deletion before addition. Challenges requirements before building. |

Level sticks until changed or session end.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **rig** | `/rig` | Lazy mode itself. Simplest solution that works. |
| **rig-review** | `/rig-review` | Over-engineering review: `L42: yagni: factory, one product. Inline.` |
| **rig-audit** | `/rig-audit` | Whole-repo over-engineering audit: ranked list of what to delete. |
| **rig-debt** | `/rig-debt` | Harvest `rig:` shortcut comments into a tracked ledger. |
| **rig-gain** | `/rig-gain` | Measured-impact scoreboard: less code, less cost, more speed. |
| **rig-help** | `/rig-help` | This card. |

Codex uses `@rig`, `@rig-review`, and `@rig-help`; Claude Code
and OpenCode use the slash-command forms above (OpenCode ships all six as
slash commands).

## Deactivate

Say "stop rig" or "normal mode". Resume anytime with `/rig`.
`/rig off` also works.

## Configure Default Mode

Default mode = `full`, auto-active every session. Change it:

**Environment variable** (highest priority):
```bash
export RIG_DEFAULT_MODE=ultra
```

**Config file** (`~/.config/rig/config.json`, Windows: `%APPDATA%\rig\config.json`):
```json
{ "defaultMode": "lite" }
```

Set `"off"` to disable auto-activation on session start, activate manually
with `/rig` when wanted.

Resolution: env var > config file > `full`.

## Update

Enable auto-update once: open `/plugin`, go to Marketplaces, pick rig, Enable auto-update. Claude Code then pulls new versions at startup (run `/reload-plugins` when it prompts). Manual refresh: `/plugin marketplace update rig` then `/reload-plugins`.

If `/plugin` is not recognized, your Claude Code is out of date. Update it (`npm install -g @anthropic-ai/claude-code@latest`, or `brew upgrade claude-code`) and restart. Other hosts use their own update flow.

## More

Full docs + examples: https://github.com/vaibhav-kodiyan/agentic-harness-demo
