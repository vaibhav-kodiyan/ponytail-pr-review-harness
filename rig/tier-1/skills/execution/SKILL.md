---
name: rig-execution
description: Execute an approved plan with independent task ownership and evidence-based completion.
---

# Execution And Parallelism

Use when Gate 2 contains multiple tasks, parallel work is explicitly useful, or
a completion claim needs coordinated verification.

## Process

1. Split only work that is genuinely independent, with non-overlapping file
   ownership and a concrete expected result.
2. Give each worker the relevant Gate 1 and Gate 2 context, boundaries, and one
   verification command. Do not delegate vague exploration.
3. Keep dependent or tiny work local; coordination has a cost.
4. Review every returned diff and reconcile integration assumptions before
   accepting it.
5. Run the narrow check after each slice, then the relevant integrated suite.
6. Inspect command output and repository state immediately before claiming
   success. Never infer success from intent, old output, or a worker's summary.

## Boundaries

Parallelism does not weaken the two gates. No worker may edit Gate 1. A worker
that discovers a contradiction stops and reports it. Completion means current
evidence demonstrates the requested behavior and no required work remains.

## Decision Questions

When asking the user to choose, give concrete options plus a recommendation.
Keep one decision per question unless the user asks for a broader menu.

Source: superpowers subagent-driven development and verification-before-completion
doctrine, adapted to Rig's gates.
