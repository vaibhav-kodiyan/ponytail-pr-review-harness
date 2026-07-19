---
name: rig-debt
description: >
  Harvest every `rig:` comment in the codebase into a debt ledger, so the
  deliberate shortcuts and deferrals rig leaves behind get tracked instead
  of rotting into "later means never". Use when the user says "rig debt",
  "/rig-debt", "what did rig defer", "list the shortcuts", "rig
  ledger", or "what did we mark to do later". One-shot report, changes nothing.
---

Every deliberate rig shortcut is marked with a `rig:` comment naming
its ceiling and upgrade path. This collects them into one ledger so a deferral
can't quietly become permanent.

## Scan

Grep the repo for comment markers, skipping `node_modules`, `.git`, and build
output:

`grep -rnE '(#|//) ?rig:' .`  (add other comment prefixes if your stack uses them)

Each hit is one ledger row. The comment prefix keeps prose that merely mentions
the convention out of the ledger.

## Output

One row per marker, grouped by file:

`<file>:<line>, <what was simplified>. ceiling: <the limit named>. upgrade: <the trigger to revisit>.`

The convention is `rig: <ceiling>, <upgrade path>`, so pull the ceiling
and the trigger straight from the comment. Want an owner per row too? add
`git blame -L<line>,<line>`.

Flag the rot risk: any `rig:` comment that names no upgrade path or
trigger gets a `no-trigger` tag, those are the ones that silently rot.

End with `<N> markers, <M> with no trigger.` Nothing found: `No rig: debt. Clean ledger.`

## Boundaries

Reads and reports only, changes nothing. To persist it, ask and it writes the
ledger to a file (e.g. `RIG-DEBT.md`). One-shot. "stop rig-debt" or
"normal mode" to revert.
