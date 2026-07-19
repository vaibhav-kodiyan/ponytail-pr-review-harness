Before acting, read `rig/tier-1/routing.md` and route this task through its skill table.

# Rig Development

Rig installs a curated markdown-only agent workflow into other repositories.
Tier 1 supports the repository's static agent-host entrypoints through
`rig/bootstrap.sh`.

## Architecture

- `rig/tier-1/routing.md` is the single task router.
- `rig/tier-1/skills/` contains Rig's curated phase owners and grafts.
- `rig/tier-1/rules/rig.md` activates the implementation rule.
- `skills/rig/SKILL.md` is the unchanged Rig source component.
- `.claude/skills/` and `.agents/skills/` are install targets for native Claude
  and Codex discovery; their payloads must stay identical.
- `rig/bootstrap.sh` is a fixed copy list, not a manifest or materializer.
- `tests/rig-bootstrap.test.js` proves the fresh-repo multi-host install.

Tier 1 must remain markdown-only in installed repositories: no runtime, secrets,
manifest parser, sync engine, or generated `.env` files.

## Checks

```sh
npm run test:rig
npm test
```

The rest of the repository is the existing Rig component and its adapters.
When changing those internal files, keep their established tests and generated
copies green; do not route new Tier 1 behavior through the old plugin runtime.
