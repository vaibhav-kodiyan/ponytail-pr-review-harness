---
name: rig-tdd
description: Drive one behavior at a time through a strict red-green-refactor loop using agreed seams and non-tautological tests.
---

# TDD

## Before Red

- `[mattpocock]` Read `CONTEXT.md`, ADRs, and nearby tests for domain vocabulary.
- `[mattpocock]` Agree the test seam and public behavior with the user before
  writing a test. Gate 1 acceptance artifacts remain frozen.
- `[mattpocock]` Choose a tracer-bullet slice that crosses the real stack while
  proving one behavior.

## Red-Green-Refactor

1. `[superpowers+mattpocock]` Write one behavior-focused test through a public
   interface, preferring real code over mocks.
2. `[superpowers]` Run it and watch it fail for the expected reason. A syntax
   error, broken fixture, or unrelated failure is not RED.
3. `[superpowers]` If production code was written first, delete it and restart
   from the failing test. No keep-as-reference exception.
4. `[superpowers+mattpocock]` Write the minimum code that makes this test pass.
5. `[superpowers]` Run the test and relevant nearby suite; inspect the output.
6. `[superpowers]` Refactor production and local test artifacts now while all
   tests stay green. Do not defer local cleanup to review.
7. Repeat for the next behavior.

## Guards

- `[mattpocock]` Reject tautological tests whose assertion recomputes the
  expected value with the same algorithm as production.
- `[superpowers]` Reject rationalizations such as "too small to test", "I will
  add tests later", or "manual verification is enough".
- `[superpowers+mattpocock]` One test owns one observable behavior. Test outcome,
  not implementation detail.

## Completion Check

`[superpowers]` Show the final test command failing before the implementation
and passing after it, all relevant tests green, and no debug-only test artifacts
left behind.

## Decision Questions

When asking the user to choose, give concrete options plus a recommendation.
Keep one decision per question unless the user asks for a broader menu.

Provenance: each check is labeled `superpowers`, `mattpocock`, or both. gstack
is not a TDD source and is intentionally absent.
