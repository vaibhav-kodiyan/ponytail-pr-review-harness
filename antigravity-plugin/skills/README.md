# Antigravity plugin skills

Thin adapter: do not fork skill bodies here. Workspace skills live under
`.agents/skills/` (materializer / Codex co-read tree) and the shared SSOT under
`skills/` at the repo root. Install those via Rig bootstrap/materializer, then
add this plugin from Customizations / `agy plugin` for hooks + MCP template.

Verify skill discovery paths on your Antigravity install — global skill dirs
still drift across IDE / CLI / standalone (§9 of the Antigravity customization
reference).
