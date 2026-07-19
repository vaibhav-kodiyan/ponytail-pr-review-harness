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

`npm test` is the full CI gate: it runs `scripts/check-rule-copies.js`,
`scripts/check-versions.js`, the Node test suite, and the pi-extension tests —
the same commands `.github/workflows/test.yml` runs. Run it locally and confirm
it is green before pushing; do not push on a red or unrun suite. `npm run
test:rig` is a fast subset (the bootstrap test only) and is not a substitute.

```sh
npm test        # full CI gate — must pass before push
npm run test:rig  # fast bootstrap-only subset
```

The rest of the repository is the existing Rig component and its adapters.
When changing those internal files, keep their established tests and generated
copies green; do not route new Tier 1 behavior through the old plugin runtime.
