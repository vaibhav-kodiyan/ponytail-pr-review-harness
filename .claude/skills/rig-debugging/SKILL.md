---
name: rig-debugging
description: Find root causes through a tight reproduction loop, ranked hypotheses, boundary evidence, and defense in depth.
---

# Systematic Debugging

Before investigation, declare the files and systems in scope. **Do not edit
outside that boundary. Stop and renegotiate scope first.** `[gstack]` This is a
strong prose fallback for the gstack freeze hook; Tier 1 markdown cannot enforce
it at the tool boundary.

## Six Phases

1. **Build the loop.** `[mattpocock]` Recreate the exact received bug with the
   tightest red-capable loop: failing test, curl, CLI snapshot, headless browser,
   event replay, focused harness, fuzz case, bisection, differential check, or
   human-in-the-loop script. Minimise the repro without changing the symptom.
2. **Instrument.** `[superpowers+mattpocock]` Trace inputs and outputs at every
   component boundary. Use temporary tagged `[DEBUG-xxx]` logs. For performance,
   measure before changing anything.
3. **Hypothesize.** `[mattpocock]` Present 3-5 ranked, falsifiable hypotheses.
   Recreate the exact bug, then cross them off from most to least likely with one
   discriminating observation at a time.
4. **Compare.** `[superpowers]` Diff a working case against the broken case:
   data, environment, ordering, permissions, configuration, and lifecycle.
5. **Fix the cause.** `[superpowers+mattpocock]` Add a regression test at the
   correct seam before the fix, make one minimal change, and run the original
   loop. If there is no testable seam, report that as a design finding.
6. **Harden and close.** `[superpowers]` Harden other plausible sources where a
   small guard prevents the same failure class. Remove temporary instrumentation,
   run broader checks, reproduce the user's original path, and record the cause.

## Escalation

- `[superpowers]` Three failed fixes means stop patching and question the
  architecture or assumed boundary.
- `[gstack]` Reuse prior investigation notes when a project-local store exists;
  otherwise continue without inventing state.
- `[superpowers]` Never bundle speculative fixes. Evidence must connect each
  hardening change to a plausible failure source.

## Decision Questions

When asking the user to choose, give concrete options plus a recommendation.
Keep one decision per question unless the user asks for a broader menu.

Provenance: every distinctive check is labeled. Shared root-cause, reproduction,
single-change, regression-test, and actual-symptom checks are labeled jointly.
