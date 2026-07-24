# Rig — Production Foundational Design

Consolidated 2026-07-17 as the Gate 2 plan for shipping Rig to production.
Folds together the initial plan (`rig-foundational-design.md`, 13 decided /
3 open), the decisions log (`grill-decisions.md`, G1–G11a), the shipped Tier 1
design (`../tier-1-design-docs/tier-1-mvp-design.md`), and the partially
grilled Tier 2 design (`../tier-2-design-docs/tier-2-design.md`).

**Status: Gate 2 FROZEN for slices S1–S6 (Tier 1 production hardening +
Tier 2 Basic). Tier 2 Advanced (S7) is GATED on G11a and returns to
grilling — it is scoped as a boundary here, not designed.**
§9 carries the per-slice implementation instructions.

---

## 1. Gate 1 restated — what "production" means

Production is the point where a stranger consumes Rig without this machine or
this checkout. Frozen intent, by reference:

1. **Clone → one command → pick a tier → configured agent**, across hosts
   (#1 delivery model C, #2 à-la-carte, premise 2: strangers are the audience).
2. **Pinned and reproducible.** Tier 1 pins the source ref; Tier 2 manifests
   pin a version so an install is repeatable (Constraints).
3. **Secrets never land in git** — gitignored `.env`, generated `.env.example`
   with blank placeholders (#7, non-negotiable).
4. **The two-gate pipeline is enforceable where hooks exist** and its
   best-effort limit is stated, never silent, elsewhere (#13, G6/G6a).
5. **Rig stays config, not a runtime.** The host agent is the only brain
   shipped today (#11). Whether that ever changes is G11a — a Gate 1 decision
   this doc does not make.

## 2. Current-state trace — Tier 1 as shipped

An install today runs from a full Rig checkout:
`sh rig/bootstrap.sh --tier 1 --target R` copies a **fixed, hardcoded list**
(the proto-manifest, per G3a) — router + ponytail rule + 7 skills into
`.rig/`, byte-identical mirrors of the 7 skills into `.claude/skills/rig-*`
and `.agents/skills/rig-*`, 5 host adapter files, and an idempotent one-line
router pointer appended to `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` /
`.github/copilot-instructions.md`. All markdown; no keys, no processes.
`tests/rig-bootstrap.test.js` proves the fresh-repo install: payload identity
across the three skill trees, pointer idempotence on re-install, adapter
content, a secret-pattern scan over every installed file, and `.env` absence.

### Gaps between shipped Tier 1 and Gate 1's production bar

| Gap | Evidence | Owned by |
|---|---|---|
| Install requires a local Rig checkout — the "pull from a pinned source" half of model C (#1) doesn't exist | `bootstrap.sh` resolves `SOURCE_ROOT` from its own path; README says "From this checkout" | S1 |
| No Rig release exists; tags v1.0.0–v4.8.0 and `package.json` 4.8.4 are ponytail history | `git tag`; `package.json` | S1 |
| `publish.yml` npm-publishes on any `v*` tag but the package is now `"private": true` — the next tag fails CI | `.github/workflows/publish.yml`; `package.json:4` | S1 |
| CI gates pushes to `main`, but the default branch is `master` — direct pushes are ungated | `.github/workflows/test.yml`; `origin/HEAD` | S1 |
| No manifest, materializer, or sync/check (deliberate Tier 1 bound, G3) | `rig/bootstrap.sh` comment | S2–S3 |
| No credential wiring, `.env.example` generation, or gitignore management (Tier 1 forbids it) | test asserts `.env*` absent | S4 |
| Zero enforcing entries — #13's hard gate and the debug freeze hook are prose-only everywhere today | `rig/tier-1/routing.md` "best-effort on both supported hosts" | S5 |
| Curation proof point (G1a) recommended, never run; grafts shipped on the unproven thesis | `grill-decisions.md` G1a | S6 / R2 |
| Repo identity is still ponytail-era at the edges: remote `agentic-harness-demo`, npm name/version lineage | `git remote -v` | R3 |

## 3. Chosen approach and touched seams

Ship production in two moves that reuse what exists rather than adding
machinery:

- **Tier 1 goes to production by adding only distribution**: a pinned-ref
  fetch wrapper around the unchanged `bootstrap.sh`, plus a real release +
  CI gate. The payload, layout, and test are already production-shaped.
- **Tier 2 Basic is the spine built once** (#4): the fixed copy list in
  `bootstrap.sh` converts 1:1 into the first manifest; a single materializer
  script reads it and reproduces today's layout exactly (G3a: describe, don't
  reshape). Sync/check is the same script re-run in diff mode —
  `check-rule-copies.js` generalized, as #10 already predicted.

Touched seams, in full: `rig/bootstrap.sh` (gains a thin fetch entry, keeps
the copy list until S3 replaces it with the manifest), `tests/rig-bootstrap.test.js`
(extended, not rewritten), `.github/workflows/*` (branch fix, tag gate,
publish retirement), and new files under `rig/` for the manifest, materializer,
and hook payloads. The ponytail component, its adapters, and its tests stay
untouched (CLAUDE.md constraint: no new Tier 1 behavior through the old
plugin runtime).

## 4. Data, trust, and failure boundaries

- **Trust boundary.** Everything Rig installs is text read by the host LLM —
  advisory by construction. The only hard boundary is an S5 hook at the
  tool-call edge on hook-capable hosts. That asymmetry is stated in the
  installed docs themselves (G6): strong prose raises compliance, it does not
  block.
- **Secrets.** Git carries credential *names* only (`.env.example` blanks);
  values live in gitignored `.env`. The materializer must refuse to write a
  value into any tracked file; the existing secret-pattern scan
  (`tests/rig-bootstrap.test.js:116`) extends over all Tier 2 outputs.
- **Supply chain.** Installs pin a tag or commit SHA; the pin lives in a
  committed stub in the target repo, so it is reviewable in the target's own
  history rather than vanishing inside a one-liner. A GitHub archive of a SHA
  is stable content for that SHA.
- **Failure handling.** Installers stay `set -eu`; recovery from a partial
  install is re-run, because idempotence is a tested property (pointer
  `ensure_line` today; materialize-twice-diff-zero in S3). No rollback
  machinery.
- **Concurrency / observability.** None and minimal by design: single-process
  file copies; the install prints what it placed; `--check`'s exit code is the
  drift signal CI consumes.
- **Compatibility.** The shipped Tier 1 layout (`.rig/`, `.claude/skills/rig-*`,
  `.agents/skills/rig-*`, the adapter files) is frozen as the materializer's
  target. Host-support claims stay limited to what the scripted test asserts.

## 5. Ordered slices and verification

Each slice re-enters the pipeline for build (ponytail implements, execution
verifies, review reports). Verification is a command, not a claim.

**S1 — Tier 1 production distribution and release.**
A committed stub (`RIG_REPO` + `RIG_REF`, POSIX sh + curl + tar only) fetches
the pinned source archive to a temp dir and runs its `bootstrap.sh` against
the target — model C completed, no runtime added. Fix `test.yml` to gate
`master`; retire `publish.yml` (private package). First production tag:
**v5.0.0** — the major bump marks the Rig identity break while keeping one
version series.
*Verify:* new test case installs from a `git archive` of the checkout (offline
stand-in for the tarball) with all existing assertions passing; CI green on
the tag.

**S2 — Manifest schema freeze.**
JSON at `.rig/manifest.json` — node-stdlib-parseable, diffable, no new deps.
Entries carry: component id, source, per-host targets, pinned version,
`advisory|enforcing` class, optional credential slots, optional hook payload;
enforcing entries must carry a verify step. This meets the six-point bar of
source Open #2 (a–f) with nothing extra. The first manifest is a transcription
of the `bootstrap.sh` copy list.
*Verify:* a check script asserts the manifest's file list equals the
bootstrap's installed list exactly.

**S3 — Materializer + sync/check (the spine, #4/#10).**
One node script: reads the manifest, lays down files per host; `--check`
re-materializes and diffs against the committed output. The copy-list block
inside `bootstrap.sh` is regenerated from the manifest at development time and
CI asserts zero drift — the Tier 1 installer stays dependency-free sh, and the
manifest is the single source. Profiles and anti-drift cost nothing further —
they are properties of the manifest (#10), not subsystems.
*Verify:* temp-repo test — materialize twice, zero diff; mutate an installed
file, `--check` reports it and exits nonzero.

**S4 — Tier 2 Basic credential wiring (#7, G11).**
Credential slots in manifest entries emit `.env.example` (blank placeholders,
"keys stay local" stated), ensure `.gitignore` covers `.env`, and emit
per-host MCP/tool config referencing env *names* only. Rig never reads or
echoes a secret value.
*Verify:* temp-repo test asserts blank placeholders, no `.env` created, the
gitignore line present, and the secret scan green over every output.

**S5 — Enforcing entries and the pipeline gate (#12, #13, G6a).**
Two initial enforcing entries: the Gate 1 oracle guard (PreToolUse deny on
declared acceptance-test paths for the implementing agent) and the debugging
freeze/scope hook (G8). Hook-capable hosts get real hooks materialized;
hook-less hosts get the strong-prose fallback with the limitation stated in
the installed text.
*Verify:* hook unit test — a simulated edit to a protected path is denied;
fallback prose asserted present in hook-less host targets.

**S6 — First recipe: the ETL self-verify loop (#11a).**
A recipe entry wires a verify-script slot (the *host* agent authors the script
as normal project code) plus a "run verify after a change, iterate on failure"
hook/instruction. Dogfooded in a sample repo, this doubles as the deferred
G1a evidence: does the curated config catch what raw concatenation misses?
*Verify:* dogfood run — the agent authors the verify script, a seeded failure
is caught and iterated to green without human patching.

**S7 — Tier 2 Advanced (GATED — returns to Gate 1).**
Blocked on G11a (host-brain B1 vs Rig-brain B2; standing grill recommendation
B1), then the memory-store grill (format, repo-scoping, host portability).
Boundary honored here: whatever lands must keep #11 — Rig emits config, not
code — unless the user overrules it at Gate 1. Nothing in S1–S6 depends on
this decision.

## 6. Rejected alternatives

- **npm-distributed installer** — adds node/npm to every target repo,
  contradicts markdown-only installs, and the repo's npm identity is ponytail
  legacy. (Models A copy-in and B symlink were already rejected in #1.)
- **git submodule for the payload** — the stub+tarball gives the same pin
  without submodule UX punishing strangers (premise 2).
- **Ephemeral `curl | sh` as the only install path** — leaves no reviewable
  pin in the target repo; acceptable at most as a convenience alias for the
  committed stub.
- **YAML/TOML manifest** — needs a parser dependency; JSON is diffable and
  stdlib-parseable in the tooling the repo already runs.
- **A second tag series (`rig-v*`)** — two version identities to explain
  forever; one series with a major bump does the same job.
- **Designing Tier 2 Advanced now under an assumed B1** — G11a is a Gate 1
  decision; designing around it silently is exactly what this product's own
  pipeline forbids.

## 7. Risks and returns to Gate 1

- **R1 — G11a undecided.** Blocks S7 only. Needs the user to pick B1 or B2;
  the grill recommendation (B1) stands.
- **R2 — curation thesis unproven (G1a).** The grafts shipped without the
  proof point. S6's dogfood is the cheap retro-proof; if it fails, that is
  Gate 1 feedback for the graft in question, not something to patch silently.
- **R3 — repo identity.** The remote is still `agentic-harness-demo` and the
  npm lineage is ponytail's. Recommendation: rename the repo to match Rig at
  the v5.0.0 release. Owner action; flagged, not taken here.
- **R4 — host drift.** Adapters encode point-in-time knowledge of host
  entrypoints. Production cadence: the scripted matrix test at every release,
  plus a manual smoke on one native-skill host and one router-less host.

## 8. Production success criteria

- A stranger with git + curl + sh installs Tier 1 into a fresh repo from a
  pinned release — no Rig checkout — and both host families come up configured
  (test-asserted, S1).
- Re-running the install or materializer is a no-op; `--check` catches induced
  drift (S3).
- A Tier 2 Basic install carries credentials by name only; the secret scan
  stays green (S4).
- The #13 gate is a real tool-boundary denial on hook-capable hosts, and its
  absence elsewhere is stated in the installed text (S5).
- Every grafted skill keeps source provenance; the ETL recipe dogfood passes
  (S6).
- Repo, releases, and docs read as Rig (G10); ponytail remains the named
  implementation component, unchanged.

## 9. Implementation instructions

### 9.0 Conventions for every slice

- **One slice = one branch = one PR** into the default branch. Per #13,
  dogfooded on ourselves: the slice's tests are written first from the
  *Verify* lines of §5 and are not edited during implementation; a wrong test
  goes back through intent, logged.
- **Green bar for every PR:** `npm run test:rig && npm test` plus the slice's
  own verify command. CI must run on the PR (S1 fixes the branch gate first).
- **No new dependencies.** All new tooling is node stdlib or POSIX sh
  (ponytail rule). Nothing routes through the old plugin runtime, and
  `skills/ponytail/` and its generated copies stay byte-identical.

### 9.1 S1 — distribution and release

Files: **new** `rig/install.sh`; **modify** `rig/bootstrap.sh`,
`tests/rig-bootstrap.test.js`, `scripts/check-versions.js`,
`.github/workflows/test.yml`, `README.md`, `CLAUDE.md`, `package.json`;
**delete** `.github/workflows/publish.yml`.

1. Create `rig/install.sh` (`chmod 755`), the whole stub:

   ```sh
   #!/usr/bin/env sh
   set -eu
   RIG_REPO=${RIG_REPO:-https://github.com/vaibhav-kodiyan/agentic-harness-demo}
   RIG_REF=${RIG_REF:-v5.0.0}
   tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
   curl -fsSL "$RIG_REPO/archive/$RIG_REF.tar.gz" | tar -xz -C "$tmp" --strip-components=1
   sh "$tmp/rig/bootstrap.sh" --target "$(pwd)" "$@"
   ```

   User flags come after `--target "$(pwd)"`, so an explicit `--target` wins
   (the bootstrap's argument loop keeps the last occurrence).
2. In `bootstrap.sh`, add `install_markdown rig/install.sh .rig/install.sh`
   next to the routing.md line. The installed stub carries the pin, so every
   Rig repo can review, re-run, and upgrade its own install (model C
   completed). Upgrade path: edit `RIG_REF` in `.rig/install.sh`, re-run it.
3. In `tests/rig-bootstrap.test.js`: change the `.rig`-is-markdown-only
   assertion to exempt exactly `.rig/install.sh`; assert the stub exists and
   contains `RIG_REF=`; add an offline install case — `git archive HEAD`
   extracted to a temp dir stands in for the release tarball, run that copy's
   `bootstrap.sh` against a second temp repo with the existing assertions.
   Optionally cover the stub itself with `RIG_REPO=file://$tmp` pointing at a
   local `archive/<ref>.tar.gz` built by `git archive` (curl accepts
   `file://`).
4. In `CLAUDE.md`, amend the markdown-only sentence to "markdown-only plus the
   pinned install stub (`.rig/install.sh`)" — this records the deliberate
   reconciliation of #1's committed bootstrap with the markdown-only phrasing
   (§3, §6).
5. In `scripts/check-versions.js`, assert the stub's default `RIG_REF` equals
   `v` + the `package.json` version, so a release cannot ship a stale pin.
6. `test.yml`: `branches: [main, master]`. Delete `publish.yml` (the package
   is private; git history preserves it if the pi-extension ever needs its own
   publish flow).
7. `README.md`: replace the "From this checkout" quickstart with the one-liner
   (`curl -fsSL <raw stub URL> | sh -s -- --tier 1`), and document that the
   install commits a pinned, reviewable `.rig/install.sh`.
8. Release: run `scripts/check-versions.js` to find every stamped file, bump
   to **5.0.0**, set the stub default ref to `v5.0.0`, merge, tag `v5.0.0`,
   push the tag. Release notes include the payload list:
   `grep -E '^(install_markdown|ensure_line)' rig/bootstrap.sh`. Do the R3
   repo rename before tagging if possible; if after, GitHub's rename redirect
   keeps the baked `RIG_REPO` default working.

Done when: on a machine with only git + curl + sh, the one-liner in a fresh
repo produces the full asserted layout, and CI is green on the tag.

### 9.2 S2 — manifest schema freeze

Files: **new** `rig/tier-1/manifest.json`, `rig/tier-2/manifest-schema.md`,
`scripts/check-manifest.js`; **modify** `package.json`, `test.yml`.

1. Transcribe `bootstrap.sh` into `rig/tier-1/manifest.json` — top level
   `{ "rig": "1", "source": { "repo", "ref" }, "entries": [...] }`. Copy
   entries: `{ "id", "class": "advisory", "source", "targets": { host:
   path } }`; pointer entries: `{ "id", "class", "line", "targets" }`.
   Reserved (used from S4/S5 on): `credentials: [{ env, description }]`,
   `hook`, and `verify` (mandatory when `class` is `"enforcing"`).
2. `rig/tier-2/manifest-schema.md` documents each field and maps it to the
   six-point bar of source Open #2 (a–f): components+versions+hosts (a),
   rule+hook bundles (b), diffable JSON (c), nameable/composable for profiles
   (d), advisory|enforcing + verify (e), gate-pipeline entries (f).
3. `scripts/check-manifest.js` (node stdlib): parse the
   `^install_markdown (\S+) (\S+)` and `^ensure_line (\S+) '(.+)'` lines out
   of `bootstrap.sh` and assert set-equality with the manifest in both
   directions. Wire as `npm run check:manifest` and add to `test.yml`.

Done when: editing either `bootstrap.sh` or `manifest.json` alone fails CI.

### 9.3 S3 — materializer + sync/check

Files: **new** `scripts/rig-materialize.js`, `tests/rig-materializer.test.js`;
**modify** `rig/bootstrap.sh` (generated-block markers), `package.json`,
`test.yml`.

1. `rig-materialize.js` CLI:
   `--manifest <file> --target <dir> [--hosts a,b] [--check] [--emit-bootstrap]`.
   Copy semantics identical to `install_markdown`; line semantics identical to
   `ensure_line` (append-if-absent — idempotence is load-bearing).
2. `--check` recomputes every target's expected content, prints each drifted
   path, exits 1 on any drift — this is #10's sync/check command and the CI
   drift signal for Tier 2 repos.
3. `--emit-bootstrap` regenerates the copy-list block of `bootstrap.sh`
   between `# BEGIN/END GENERATED` markers from the manifest; CI runs it and
   asserts zero git diff (same committed-generated-output pattern as
   `check-rule-copies.js`). This supersedes 9.2's regex set-equality check —
   retire `check-manifest.js`'s list comparison when it lands. Tier 1
   installs stay plain sh; Tier 2 targets get the manifest + materializer
   committed instead.
4. Tests: materialize twice into a temp dir → identical tree (walk + hash);
   corrupt one installed file → `--check` exits 1 naming that path;
   `--emit-bootstrap` on a clean tree → zero diff.

### 9.4 S4 — credential wiring

Files: **modify** `scripts/rig-materialize.js`,
`tests/rig-materializer.test.js` (fixture manifest with a credential slot).

1. Collect `credentials[]` across selected entries → write `.env.example`:
   a header comment ("Copy to .env and fill in; .env is gitignored — keys
   never land in git.") plus `NAME=` lines. The writer takes only env *names*
   as input, so it is structurally incapable of emitting a value.
2. Ensure `.gitignore` contains `.env` (same append-if-absent semantics).
3. Host tool/MCP config emission (first target: `.mcp.json` for Claude)
   references `${NAME}` env expansion only.
4. Extend the secret-pattern scan in the tests over every file the
   materializer writes.

Done when: the fixture install shows blank placeholders, the gitignore line,
no `.env`, and a green scan.

### 9.5 S5 — enforcing hooks and the pipeline gate

Files: **new** `rig/tier-2/hooks/protect-gate1.sh`,
`rig/tier-2/hooks/debug-freeze.sh`, `rig/tier-2/prose/gate1-fallback.md`,
`tests/rig-hooks.test.js`; **modify** `scripts/rig-materialize.js`,
`scripts/check-manifest.js` (verify-step presence), manifest entries.

1. Protected paths are declared in `.rig/gate1-paths` (one glob per line),
   authored by the grilling phase alongside the acceptance tests — never by
   the implementer.
2. `protect-gate1.sh` reads the host's PreToolUse payload on stdin (Claude
   Code contract: JSON with tool name and `file_path`; blocking = exit 2 with
   the reason on stderr) and denies Edit/Write-class calls whose path matches
   `.rig/gate1-paths`. `debug-freeze.sh` uses the same contract and, while
   `.rig/debug-scope` exists, denies edits outside its globs (G8's freeze).
3. Materializer: on hook-capable hosts emit the hook registration (Claude:
   a `PreToolUse` entry in `.claude/settings.json` invoking the script); on
   hook-less hosts append `gate1-fallback.md`'s strong prose to the adapter
   text, with the G6 limitation stated in the installed text itself.
4. `check-manifest.js`: every `class: "enforcing"` entry must name a `verify`
   command (#12).
5. Tests: pipe simulated payloads into each hook — protected path blocked,
   unprotected path allowed; hook-less host target contains the fallback
   prose.

### 9.6 S6 — ETL self-verify recipe

Files: **new** `rig/tier-2/recipes/etl-self-verify/RECIPE.md`, a manifest
entry for it, and `project-dev-docs/tier-2-design-docs/etl-recipe-dogfood.md`
(evidence).

1. `RECIPE.md` instructs the *host* agent to author `scripts/verify.sh` in the
   target as normal project code (spin up local artifacts, health-check, curl
   with params, assert data) and installs the loop rule: run verify after
   every change, iterate on failure (#11a).
2. Dogfood in a fresh sample repo with one seeded ETL bug. Record in the
   evidence doc: the agent authored verify unaided, the seeded failure was
   caught, and iteration reached green without human patching. This is the
   G1a retro-proof; a miss returns to grilling as Gate 1 feedback.

### 9.7 Order, parallelism, releases

S1 ships alone first — it *is* the production release. S2 → S3 sequentially
(schema before engine); S4 and S5 in parallel after S3; S6 last (it consumes
S4's credential slots and S5's hook mechanics). S7 stays gated on G11a
throughout. Tag `v5.1.0` when S3 lands (Tier 2 Basic spine) and `v5.2.0` when
S6 lands (first recipe); every tag re-runs the full S1 release checklist.
