# Rig Router

Read this file before acting. Apply `.rig/rules/rig.md` to every coding
task, then choose the smallest set of skills whose trigger matches the work.
In this source checkout, use `rig/tier-1/rules/rig.md` instead.
Read each chosen skill completely before proceeding.

Native skill hosts discover the names below automatically. On instruction-only
hosts, `rig-<name>` maps to `.rig/skills/<name>/SKILL.md`;
`rig-implementation` maps to `.rig/skills/implementation/SKILL.md`. In this
source checkout, those sources live at `rig/tier-1/skills/<name>/SKILL.md` and
`skills/rig/SKILL.md`.

## Pipeline

For a new feature or behavioral change, use the phases in order:

1. `rig-grilling` freezes business intent and independently authored acceptance
   tests (Gate 1).
2. `rig-product-design` freezes the technical approach without changing Gate 1
   (Gate 2).
3. `rig-implementation` implements the smallest correct diff. The implementer
   MUST NOT author or edit Gate 1 artifacts.
4. `rig-execution` coordinates independent work and verifies evidence before any
   completion claim.
5. `rig-code-review` reviews from fresh context and reports only.

If Gate 1 is genuinely wrong, stop implementation and return the proposed
change to `rig-grilling`. Prose cannot physically prevent an edit: this Tier 1
markdown-only guard is best-effort on both supported hosts.

## Decision Questions

When asking the user to choose, give concrete options plus a recommendation.
Keep one decision per question unless the user asks for a broader menu. Do not
hide a meaningful fork behind a yes/no question when the real choice has more
than two viable paths.

## Skill Index

| Skill | Read when |
|---|---|
| `rig-grilling` | Requirements are new, ambiguous, risky, or need acceptance tests. |
| `rig-product-design` | Business intent is frozen and an implementation approach, tradeoff decision, or technical plan is needed. |
| `rig-implementation` | Any code will be written, changed, refactored, or removed. Always active for implementation. |
| `rig-execution` | A plan has multiple independent tasks, parallel work is requested, or completion needs verification. |
| `rig-tdd` | Implementing behavior or fixing a defect through a red-green-refactor loop. |
| `rig-debugging` | Investigating a failure, flaky behavior, performance regression, or unknown root cause. |
| `rig-code-review` | Reviewing a diff, PR, branch, or proposed change. Report only. |

Do not substitute a nearby skill for the named owner. Debugging discovers why;
TDD drives a known behavior change; review judges an existing diff.
