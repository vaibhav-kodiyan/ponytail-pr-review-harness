---
name: rig-product-design
description: Turn frozen business intent into a thorough, bounded technical design before implementation.
---

# Product And Technical Design: Gate 2

Use only after Gate 1 defines correct behavior. This phase owns **how**. It may
challenge feasibility or return contradictions to grilling, but it never edits
the acceptance oracle.

## Process

1. Restate Gate 1 and trace the current system end to end.
2. Identify the smallest existing seams that can carry the behavior.
3. Compare build, reuse, standard-library, native-platform, and installed-tool
   options before adding machinery.
4. Specify data flow, trust boundaries, failure handling, concurrency, rollout,
   observability, and compatibility only where the feature actually touches
   them.
5. Name rejected alternatives and the concrete reason each loses.
6. Break the design into tracer-bullet slices with a verification command for
   each slice.
7. Freeze the chosen approach as Gate 2 and hand it to implementation.

## Standard

Planning is thorough; the resulting code is minimal. Do not hide uncertainty
inside abstractions or create extension points for imagined futures. Escalate a
Gate 1 contradiction instead of designing around it silently.

## Decision Questions

When asking the user to choose, give concrete options plus a recommendation.
Keep one decision per question unless the user asks for a broader menu.

## Output

- Current-state trace
- Chosen approach and touched seams
- Data, safety, and failure boundaries
- Ordered slices and verification
- Rejected alternatives
- Risks or decisions requiring a return to Gate 1

Source: gstack product and engineering planning doctrine, extracted as markdown;
stateful gstack runtime features are intentionally excluded.
