# Tier 2 Basic — Consolidated Design

**Single source of truth for Tier 2 Basic.** Consolidated 2026-07-18 from the four working docs
this directory used to hold (`basic-scope-decisions.md` → BSC, `secret-chain-decisions.md` → SC,
`basic-design-decisions.md` → PD, and the prior `basic-design.md` spec). All decisions, their
rationale, and rejected alternatives are folded in below; the separate logs are retired.

- Product source of truth: `../../foundational-design/rig-foundational-design.md`
- Supersedes the "in progress" Basic material in `../tier-2-design.md` §2/§3
- Tier 1 sibling: `../../tier-1-design-docs/tier-1-mvp-design.md`

**Status.** Gate 1 (intent + acceptance) and Gate 2 (mechanism) are locked, and the Tier 2 Basic build
has shipped in this repository: `rig/materialize.js`, the `rig/lib/*` implementation modules, the
canonical manifest, and the build-owned `tests/basic-*.test.js` coverage are present. The acceptance,
component, Tier-1 regression, and full repository suites are **GREEN** (`npm run test:rig && npm test`).
The resolved mechanism includes the host→variant selection algorithm (PD3a — consolidation), manifest
schema enforcement (PD9 — hand-written `validate`), and the complete secret guard (SC6c precision
floor, SC6d hook mechanics, SC6e scanner contract).
The #7 host verification matrix is **complete (19/19, official docs only)** after the 2026-07-18
reconciliation against the shipped adapter **code** (BSC6): **OpenClaw** and **Devin** were added — real
Ponytail adapters that were missing from `docs/agent-portability.md` — and **CodeWhale** was reclassified
note-only → emit (PD6). The only outstanding checks are the two explicitly manual first-wire
verifications for OpenClaw and CodeWhale; both renderers retain their documented caveats (§10/C9).

Two gates, one rule: a Gate-2 (PD) mechanism decision may **not** edit Gate 1 (BSC scope, SC
secret-chain, the SC7 acceptance oracle); if mechanism needs intent to change, it returns to grilling.

---

## 1. What Basic IS

**Tier 2 Basic is the credentialed multi-host MCP configurator (BSC1).** The user declares an MCP
server and its credential slot **once**; Rig emits the **correct config for each host they selected**,
generates `.env.example`, gitignores `.env`, and installs a target-repo secret guard. It removes the
per-host MCP configuration burden **without a Rig runtime** and **without letting a key reach git**.

The problem it solves: an MCP config does **not** port across hosts unchanged. Each host wants a
different token syntax and a different credential-loading mechanism (proven in SC2 and by the full
matrix in §8). A user wiring the same DB/Slack/API MCP server across Claude, Cursor, and Codex must
hand-write three different configs and get three different secret mechanisms right. Basic does that
translation.

## 2. What Basic is NOT (non-goals)

| Not in Basic | Where it lives | Why |
|---|---|---|
| Agents, multi-step loops, dispatched work | Tier 2 Advanced | Basic is config + creds only. |
| Repo-scoped memory / learning store | Tier 2 Advanced | State beyond creds; the G11a fork. |
| A Rig LLM runtime / model key | Advanced fork (B2), a non-goal | #11: the agent is the generator; Rig emits config. |
| The ETL self-verify loop (verify recipe + iterate hook) | Dropped from Basic (BSC3) | It was proof-of-need, not a deliverable. |
| Any process running in the installed repo | — | The materializer runs at install time and exits (§5). |
| Any write outside the target repo | — | The generator is repo-contained (PD-open-4). |

## 2a. What "support" means (SUP — the tiered support ladder)

"Rig supports host X" is a **tiered** claim, not a promise of an emitted working MCP config
everywhere. A host is **supported** when it has a verified matrix entry (§8) **and** falls into one of
three tiers:

- **Tier A — Wired emit.** Rig emits a value-free config the host uses. Sub-shapes: `config_only_safe`
  (emit, no note), native-project emit + manual note, and **user-global-default + repo-local emit via a
  file-path override + mandatory wiring note** (the OpenClaw/CodeWhale shape, PD4/PD6/PD7). **13 hosts.**
- **Tier B — Note-only.** Rig emits **no** host MCP config because the host has no safe repo-contained,
  value-free emit path; the user gets a documented manual setup note in `.rig/mcp-setup.md`. **5 hosts**
  (Hermes, Windsurf, Cline, GitHub Copilot CLI, Antigravity).
- **Tier C — Instruction-only / no MCP.** The host has no MCP config surface; it is covered by the
  instruction payload, with one acknowledgment line (PD-open-6). **1 host** (Generic). VS Code + Codex
  extension is Tier A because it reuses the Codex renderer.

**The deliberate limit (names the A2 gap):** "support all hosts" does **not** mean an emitted working
config for all 19. For the 5 Tier-B and 1 Tier-C hosts, "support" is a documented manual step or
instruction coverage **by design** (PD-open-4, PD-open-6, PD7) — a floor, not a failure.

## 3. Scope & architecture decisions (BSC1–BSC6, Gate 1)

- **BSC1 — Identity reset (user 2026-07-17): the credentialed multi-host MCP configurator.** Replaces
  the earlier "Tier 1 config + wire an MCP server, dogfood the ETL loop" framing. Capability surface
  stays small (MCP + creds only; no agents/loops/memory — those are Advanced), but the *point* is the
  configurator, not any one recipe.
- **BSC2 — The materializer ships with Basic (user 2026-07-17; overrides the OQ-A deferral).** The
  manifest + materializer are built in Basic, not deferred to Advanced. The per-host MCP divergence
  (SC2, §8) is exactly the **composition** problem `rig/bootstrap.sh`'s own comment named as the
  trigger to retire the fixed copy list. One source-of-truth MCP definition → N correct per-host
  configs is a job a fixed copy list can't do, so the materializer is **load-bearing product**, not
  speculative machinery. Ponytail applies to *how small* the materializer is, not *whether* it exists.
- **BSC3 — The ETL self-verify loop is OUT of Basic (user 2026-07-17).** It was **proof-of-need**, not
  a deliverable. Basic ships the configurator; no verify recipe, no iterate-on-failure hook. Any
  "author + run + iterate" recipe is deferred to Advanced / a later recipe pack.
- **BSC4 — Emit for the entire Ponytail adapter matrix (user 2026-07-17, amended 2026-07-18).**
  Original ruling: ship MCP emit for every host format Rig already supports, user-selected per install.
  **Amendment (2026-07-18):** now that the work is explicitly Tier 2 Basic, the supported-host matrix
  is the **entire Ponytail adapter matrix** (`docs/agent-portability.md`), not the narrower Rig Tier-1
  entrypoint set — matching Ponytail's proven deliverability scale. The #7 gate still applies per
  renderer: a host can be in the supported matrix before its MCP emit rule ships, but **no emit rule
  ships unverified**. **Authoritative-source note (BSC6, 2026-07-18):** `docs/agent-portability.md` is a
  *derived view*, not the authority — it had drifted from the shipped adapter code (missing OpenClaw,
  Devin). BSC6 makes the **adapter code** authoritative and reconciles the doc to it; read "the entire
  Ponytail adapter matrix" as the real adapter set, not this doc as-frozen.
- **BSC5 — One manifest subsumes the whole layout (Option 2, user 2026-07-17).** The manifest covers
  **both** the Tier-1 markdown payload **and** the MCP server definitions; the materializer emits all
  of it and `bootstrap.sh`'s hardcoded copy list is **retired**. One manifest, one materializer — the
  "describe the existing layout without a reshape" that Tier 1 shipped enumerable for. *(Rejected —
  Option 1: materializer handles only the new MCP layer and leaves the markdown on the fixed copy
  list; keeps two mechanisms where one suffices.)*
- **BSC6 — Authoritative host set = the shipped adapter code; `agent-portability.md` is a derived view
  kept in sync (user 2026-07-18, Option B).** BSC4 named `docs/agent-portability.md` as "the entire
  Ponytail adapter matrix," but that doc had **drifted from the code** — it omitted **OpenClaw**
  (`.openclaw/skills/*` (6), `scripts/build-openclaw-skills.js`, `scripts/publish-openclaw-skills.js`,
  `tests/openclaw-skills.test.js`, README.es/ko install sections) and **Devin** (`.devin-plugin/
  plugin.json`, `devin plugins install DietrichGebert/ponytail`, README.es/ko install sections). Both are
  real, current, tested adapters. Ground truth is therefore the **adapter code**, not the hand-maintained
  doc; the matrix is reconciled to match. Consequence: OpenClaw and Devin enter scope and receive the
  full PD-open-3 official-docs verification (§8), taking the matrix 17 → 19; `docs/agent-portability.md`
  gains the two missing rows (Gate-1 doc edit, routed through this grilling session per the §10
  correction rule). *(Rejected — Option A: patch OpenClaw only; leaves the doc still wrong (missing
  Devin) — repeats the exact drift the finding is about.)*
- **BSC7 — Doc/code reconciliation is a committed build deliverable (user 2026-07-18).** The Gate-1
  corrections BSC6 authorizes don't just get flagged — they **ship**. In the build phase: edit
  `docs/agent-portability.md` to (a) **add the OpenClaw and Devin rows**, and (b) **relabel** the
  "instruction-tier, may have no MCP" note on Antigravity, CodeWhale, and Swival (all three ship MCP
  config; only Generic truly has none). **Same pass fixes the reverse-direction drift:** Hermes has a
  real adapter (`plugin.yaml`) and a matrix row but **no README.es/ko install section** — add it, so the
  READMEs, `agent-portability.md`, and the adapter code all agree. Authorized here (per BSC6), executed
  at build; tracked in §10. *(Rejected — leave as "open items": the whole point of BSC6 is that
  doc/code drift is the defect; recording the fix as a committed deliverable, not a maybe, is what
  closes it.)*

## 4. The secret chain (SC1–SC7, Gate 1) — #7 "keys never land in git"

The starting point (S4) kept **Rig's writer** clean — `.env.example` committed blank, `.env`
gitignored, per-host config references env **by name only**, Rig never reads/emits a value — but did
**not** answer the runtime question: what turns `${NAME}` in the committed config into the real key
inside the running MCP server, given Basic forbids a Rig runtime? Two things must both hold without a
runtime: (a) `NAME` present in the launching process's environment; (b) the host expands the by-name
reference. A gitignored `.env` is inert until something host-native loads it.

**Per-host facts (doc-backed, the three founding hosts):**

| Host | Auto-loads repo `.env`? | Expands by-name ref? | Reference token | Runtime-free `.env`→env close |
|---|---|---|---|---|
| Claude Code (CLI) | **No** | **Yes** | `${VAR}`, `${VAR:-default}` in command/args/env/url/headers | **None native** (`envFile` is only feature-request #28942) → manual step |
| Cursor | **No** (not automatic) | **Yes** | `${env:NAME}` | **Yes — native, config-only:** `envFile` (stdio only) → `${workspaceFolder}/.env`; HTTP has no `envFile` |
| Codex (CLI) | **No** | **No** (literal only; interpolation "not planned" #7367) | — | `env_vars` passthrough (must export) / `bearer_token_env_var`; no `.env` load, no `${}` in `env` |

Caveat: Claude **Desktop** doesn't expand `${VAR}` (#40372); Basic targets the **CLI**. Two framing
flips this established: (1) Cursor is the **safest** stdio host (native `envFile`), not the riskiest;
**Codex** is the genuine footgun (can't interpolate → `env` map is a paste-the-key trap). (2) The
by-name token is **not portable** (`${VAR}` vs `${env:NAME}` vs none) — there is no single committed
config that works everywhere.

**Decisions:**

- **SC1 — The missing link is real and not uniform.** No supported host auto-loads a repo `.env` into
  the MCP-server env. S4 is necessary but insufficient; it needs a host-specific 5th link.
- **SC2 — MCP config is per-host, not one shared file.** The materializer emits a **distinct** config
  per host, each with that host's own token. Unlike the skills payloads (byte-identical across
  `.claude/` and `.agents/`), the wired MCP config **cannot** be identical across hosts.
- **SC3 — Close the loop with the host's own native loader where one exists; never a Rig runtime.**
  Cursor: emit `envFile: "${workspaceFolder}/.env"` for stdio servers — config-only, no runtime, #7
  airtight.
- **SC4 — Where no native loader exists (Claude CLI, Codex-stdio), ship an explicit documented manual
  load step** — a user-run, host-native command (e.g. `set -a; source .env; set +a` before `claude`),
  **not** a Rig runtime, **not** a refusal, **not** an unguarded footgun.
- **SC5 — Never emit value-shaped config slots; steer Codex to name-only mechanisms.** Route Codex
  creds to `bearer_token_env_var` (HTTP) or the `env_vars` passthrough (stdio) — a name, never a value
  — and the generated note explicitly says *do not paste the key into `config.toml`*.
- **SC6 — Add a runtime-free target-repo secret guard.** Being "structurally incapable of emitting a
  value" protects Rig, not the user's repo. Install a **git pre-commit secret scan** (git-native, no
  Rig runtime/LLM) that blocks a commit containing a tracked `.env` or a value-shaped string.
  - **SC6a (Option B):** the hook shells out to `gitleaks`/`trufflehog` when installed (stronger).
  - **SC6b (fail-over, not fail-open/closed):** with no external scanner, fall back to a tiny
    zero-dependency regex scan. There is **always a guard floor** (regex + tracked-`.env` block),
    **upgraded** when a scanner is present. No fail-open gap; no hard dependency.
  - **SC6c — The floor is high-precision, not high-recall (user 2026-07-18).** The regex floor matches
    a **curated set of unambiguous secret formats** — e.g. `sk-`/`sk-ant-`, `ghp_`/`gho_`,
    `AKIA[0-9A-Z]{16}`, `xox[baprs]-`, `-----BEGIN … PRIVATE KEY-----` — **plus** the tracked-`.env`
    block. Reference forms (`${VAR}`, `${env:NAME}`, `envFile`, `bearer_token_env_var`) match none of
    these, so the AT-4 green case passes by construction. **Recall is the scanner tier's job (SC6a),
    not the floor's.** Governing rule: **precision over recall** — a floor that false-positives (entropy
    scans tripping on hashes, base64 assets, lockfile digests) trains users to `git commit --no-verify`
    and stops protecting anyone. *(Rejected — entropy-threshold floor: higher recall but noisy; recall
    belongs to gitleaks/trufflehog when present, which SC6a already names the stronger tier.)*
  - **SC6d — Hook install = shim + committed script, chain existing, reversible (user 2026-07-18).**
    Scan logic lives in a **committed, reviewable** `.rig/hooks/secret-guard.sh`; `.git/hooks/pre-commit`
    is a thin shim that runs it. If a `pre-commit` hook already exists, the shim **chains** it (runs the
    prior hook too), never overwrites. Uninstall removes the shim/its block and restores the original.
    **Honest limit (recorded, not a gap):** git hooks are **per-clone**, not committed state — the guard
    protects the machine where Rig was installed; a fresh clone gets it only by re-running Rig install.
    Inherent git constraint, so #7's "team" reading is not over-promised. *(Rejected — `core.hooksPath =
    .rig/hooks`: team-shareable via one install step but silently **overrides all `.git/hooks`**,
    disabling the user's other hooks — surprising side effect for marginal gain.)*
  - **SC6e — Scanner tier supplements the floor, never supersedes it (user 2026-07-18).** Detection:
    `command -v gitleaks` then `command -v trufflehog`; **prefer gitleaks** (purpose-built for staged
    pre-commit scans), fall to trufflehog, else floor-only. Invocation scans **staged** content (e.g.
    `gitleaks protect --staged --no-banner`); **exit 0 = pass, non-zero = block** with the tool's output
    surfaced. The floor + tracked-`.env` block **always run** regardless; the scanner runs *in addition*
    when present. **Commit is blocked if any check flags.** A scanner *execution error* (broken install,
    not a finding) is inconclusive → fall back to the floor's verdict + warn — **never fail-open** (the
    floor always ran), never hard-block on broken tooling. This is what SC6b's "floor, **upgraded** when
    a scanner is present" means operationally. *(Rejected — supersede: skipping the floor when a scanner
    exists drops the tracked-`.env` guarantee unless the scanner config happens to cover it, and makes
    behavior depend on which tool is installed.)*
- **SC7 — Gate-1 acceptance tests** (see §9). *(Note: mechanism lock for SC3–SC6 formally belongs to
  Gate 2, but the intent — #7 must hold in the user's repo — is Gate 1 and was unguarded.)*

Sources: Claude Code MCP docs (code.claude.com/docs/en/mcp), issues #28942 / #40372; Cursor MCP docs
(cursor.com/docs/mcp.md); Codex config reference (learn.chatgpt.com/docs/config-file/config-reference),
issues #7367 / #7521.

## 5. Core mechanism — one manifest → materializer → per-host config

Basic ships the **manifest + materializer** (BSC2, BSC5). The materializer reads the manifest and, for
each selected host, emits (a) the Tier-1 markdown files (as today), plus (b) that host's MCP config in
that host's format, referencing credentials **by name only** and using the host's native
credential-loading mechanism. It never stores or emits a secret value.

**Install-time only — no runtime in the installed repo.** The materializer is an install/config-time
emitter (same category as `bootstrap.sh`): it runs during install, emits **static** per-host config,
and exits. The installed repo runs no Rig process and no LLM (#11 intact). The manifest parser lives in
Rig's installer, not baked into every target repo; what lands in the user's repo is static files + a
gitignored `.env` + a git-native pre-commit hook. **The generator writes only inside the target repo
(PD-open-4).**

## 6. Manifest schema (the materializer's JSON input contract)

Serialization is **JSON** (PD-open-1): zero-dependency in Node, easy to validate, expressive enough
for payload ops, host tags, the supported-host matrix, semantic MCP servers, and compatibility
variants. *(Rejected — YAML/TOML: add a parsing dependency or mismatched syntax without buying
behavior.)* Minimal shape:

- **Payload** — the Tier-1 markdown files + host adapter/pointer set (what the copy list encoded).
- **Hosts** — the subset of supported host formats to emit for (BSC4).
- **MCP servers** — a list of **semantic servers**; each entry:
  - `name`
  - `variants` — one or more host-neutral compatibility shapes; each variant: `id`, `transport`
    (`stdio` | `http`), `command`+`args` (stdio) **or** `url` (http), and `credentials` — env-var
    **name(s) only, never a value** (SC5).

Each server is declared **once** and fans out by compatibility variant to every selected, verified host
that can safely represent one of its variants (PD3). No `server_for_claude` / `server_for_cursor`
duplicates; host renderers produce the native entries from the one semantic server. Host-specific
overrides, if ever needed, are exceptions — not the default schema.

**Schema enforcement (PD9, user 2026-07-18): hand-written `validate(manifest)`, no JSON Schema/ajv.**
The manifest is **Rig-internal** — authored by Rig's devs, shipped with Rig, never hand-written by end
users — and read only by Rig's Node installer (§5). So the two real advantages of a formal JSON Schema
(author-time editor autocomplete; language-portable validation) are inert here. Enforcement is a
**zero-dependency `validate(manifest)`** in the installer that checks required fields, the `transport`
enum (`stdio` | `http`), the `credential_safety` enum, transport↔shape coupling (`command`+`args` for
stdio, `url` for http), and that `credentials` are **name-only** (SC5). **An unknown host in `hosts`
is a hard validation error** (default, reversible — flip to warn-and-skip if a use case appears; a
silent skip is how you ship a config for a host you thought you selected). *(Rejected — JSON Schema +
ajv: adds a validation dependency, can't express the load-bearing semantic invariants (name-only creds,
transport↔shape, host ∈ supported matrix) anyway, so the procedural validator is needed regardless;
schema would only sit on top of it. Its autocomplete/portability wins require a user-authored,
multi-language manifest — which Basic's is not.)*

**Payload vocabulary (PD1):**

- **Two payload ops, no more (PD1a):** `copy {from, to}` (place exact bytes) and `ensure_line {to,
  line}` (append the line iff absent, into a host-owned file Rig does not own). A 1:1 map of
  `bootstrap.sh`, so the round-trip test (§9) is an **identity** check, not a reimplementation.
  Fan-out (`pointer.md` → 3 targets) is repeated `copy` entries — no `targets:[]` concept. *(Rejected:
  a third `merge`/`template` op — `ensure_line` already covers the only merge bootstrap performs.)*
- **`mcp_servers` is a separate section (PD1c)**, consumed only by the emit **generator** (§7/§8),
  never by the `copy`/`ensure_line` engine — literal placement vs generated config are different ops.
- **Host-gating (PD1d, Option B — user override of the grill-recommended Option A):** every payload
  entry carries a `host` tag (or `neutral`) and installs iff its host ∈ selected `hosts`. **Default
  `hosts` = all supported** ⇒ byte-identical to Tier-1 today (round-trip = identity; existing
  regression test stays green). Narrowing the selection prunes unselected hosts' adapters — the cleaner
  installed repo Option B buys, at the cost of one `host` tag per entry (which the manifest carries
  anyway). *(Rejected — Option A: hosts gate MCP emit only, payload unconditional; a Claude-only user
  would still receive `.kiro/steering/rig.md`, `.agents/skills/*`, etc.)*
- **`.rig/skills/*` gating (PD1a, reversible):** `.rig/routing.md` + `.rig/rules/rig.md` always
  install; `.rig/skills/*` installs when **≥1 instruction-only host** is selected (native-skill
  hosts claude/codex don't need it; antigravity is both a native `.agents/skills` co-reader and
  instruction-only so it also gets the `.rig/skills` fallback). Flip to "always install" if a
  future host reads it.

Host-tag map (from `bootstrap.sh`, confirmed against `tests/rig-bootstrap.test.js`): `neutral` always
= `.rig/routing.md`, `.rig/rules/rig.md`; `neutral` gated on ≥1 instruction-only host =
`.rig/skills/{grilling,product-design,implementation,execution,tdd,debugging,code-review}/SKILL.md`;
`claude` = `.claude/skills/rig-*` (7) + `ensure_line CLAUDE.md`;
`host: ["codex","antigravity"]` = `.agents/skills/rig-*` (7) + `.agents/rules/rig.md`;
`host: ["codex","antigravity","codewhale"]` = `ensure_line AGENTS.md` (CodeWhale reads AGENTS.md only);
`antigravity` = `.agents/workflows/rig*.md` (6);
`cursor` = `.cursor/rules/rig.mdc`; `windsurf` = `.windsurf/rules/rig.md`; `cline` = `.clinerules/rig.md`;
`kiro` = `.kiro/steering/rig.md`; `host: ["gemini","antigravity"]` = `ensure_line GEMINI.md`;
`copilot` = `ensure_line .github/copilot-instructions.md`.
`host` may be a string or an array of hosts that share one payload entry.
Instruction-only hosts (use the `.rig/skills/*` fallback): cursor, windsurf, cline, kiro, gemini, copilot, antigravity.
Native-skill hosts: claude (`.claude/skills`), codex + antigravity (`.agents/skills`).

## 7. Per-host MCP emit generator (PD2, PD3)

Net-new: Tier 1 (`bootstrap.sh`) emits **zero** MCP config, so unlike the payload there is no
round-trip identity to preserve — only the #7 safety gate.

- **PD2a — The manifest is the shared contract; renderers are deliberately repetitive.** One small
  emit function per host reads the `mcp_servers` entry directly and produces that host's **idiomatic,
  native** output. **No** shared MCP IR, **no** data-driven "template + substitution table" — the
  manifest is the only shared model; each renderer is standalone and native. *(Rationale, user: a
  renderer's job is idiomatic native output per target, not to prove all targets share a rendering
  abstraction. The full matrix in §8 confirms this — tokens are non-portable across hosts.)*
- **PD2b — Explicit, behavior-driving `credential_safety` field.** A typed, mandatory enum
  `credential_safety: "config_only_safe" | "manual_note_required"` (the discussion terms
  *safe*/*footgun* never appear in code). It drives three things, which is what makes an explicit field
  defensible over an implicit one: (1) whether `.rig/mcp-setup.md` gets a manual credential note
  (`manual_note_required` ⇒ yes); (2) whether the emitted config uses the native loader
  (`config_only_safe` ⇒ emit `envFile`); (3) validation that a host's emitted output matches its
  declared class. **Granularity is (host × transport)** — e.g. Cursor-stdio = `config_only_safe`
  (emits `envFile`), Cursor-http = `manual_note_required`. A single shared helper
  (`renderCredentialSetupNote(host)`) consumes the field; renderers stay standalone (PD2a preserved).
  Tests assert output-from-field to prevent drift. *(Rejected — implicit-only: loses the typed guard
  and drift tests.)*
- **PD2c — Notes file + README pointer.** The manual-load steps (SC4) and the Codex "never paste the
  key" warning (SC5) are written to a Rig-owned `.rig/mcp-setup.md`, regenerated each install (also the
  AT-3 grep target). The generator additionally does one `ensure_line README.md` pointer. Content stays
  **out** of `.env.example` and the README body. *(Rejected — inline into README (intrusive; needs
  section-replace on re-install); per-host note files; stdout (ephemeral, un-testable). Caveat: on a
  repo with no README, `ensure_line` creates one — consistent with Tier 1.)*
- **PD2d — Non-destructive merge.** Each renderer **adds** its server entry and preserves everything
  else in the host-owned file — the analog of `ensure_line` for markdown. JSON hosts: read-or-init,
  set `mcpServers[<name>]`, write back (zero-dependency). Codex TOML: append the `[mcp_servers.<name>]`
  block iff its header is absent (grep-guard; no TOML serializer). *(Rejected — own/overwrite (destroys
  the user's servers); own-if-absent + side file (leaves the Rig server un-wired).)*
- **PD2e — SUPERSEDED ship scope.** Original: ship Claude/Cursor/Codex only, add hosts later. Superseded
  by BSC4-amendment / PD3 (full Ponytail matrix). The surviving part is the safety gate: **no MCP emit
  rule ships unverified**.
- **PD2f — Seam (determined by a prior gate, not a preference):** the generator is a second pass in
  Rig's installer, install-time only, emits static files, exits — a consequence of §5's "no runtime in
  the target repo."
- **PD3 — Semantic servers fan out by compatibility variant; no per-host duplication.** A manifest
  `mcp_servers[]` entry is a semantic server with one or more host-neutral compatibility **variants**
  (`http`, `stdio`, …). Each server is declared **once**; the manifest never repeats it per host, and
  renderers translate the **assigned** variant into native config.
  - **PD3a — Variant assignment maximizes hosts-per-variant / minimizes distinct variants
    (consolidation, user 2026-07-18).** `variants[]` is an **unordered set**.
    `representable(host, variant) := variant.transport ∈ supported_transports(renderer(host))` —
    credentials are always name-only (SC5), so `credential_safety` **never** blocks representability; it
    only toggles the `.rig/mcp-setup.md` note. The materializer selects the **fewest distinct variants**
    that cover all selected representable hosts (greedy set-cover: repeatedly take the variant covering
    the most still-unassigned hosts; deterministic lexical-by-`id` tie-break), so the **maximum number
    of hosts share one host-agnostic shape** instead of scattering across variants — MCP's host-agnostic
    promise honored by construction, zero per-host duplication. *(Rejected — Option A, per-host greedy in
    declared order: yields identical host coverage but leaves consolidation to manifest-author ordering;
    the user wants the system itself to guarantee max-hosts-per-variant. A and B cover the same hosts and
    fail on the same uncoverable host; they differ only in which shared variant a multi-capable host
    lands on — unobservable at runtime, but B encodes the host-agnostic intent. Also rejected the
    original PD3 framing "maximize host coverage": degenerate — per-host greedy already maxes total
    coverage; the real objective is minimizing distinct variants.)*

  **Compatibility boundary:** a server can be included for a host only when the host has a
  verified renderer and ≥1 representable variant; because Basic has a fixed
  supported-host matrix, if a selected supported host is representable by **no** variant, **install fails
  with an actionable compatibility error — no silent skip.** *(Rejected — one manifest server per host:
  pushes the per-host burden back on the user, which is what Basic removes.)*

**Deliverability baseline (PD3).** Basic matches Ponytail's deployment model: fixed host-support
matrix, shared core behavior, thin host-native renderers, full-matrix tests. No dynamic host discovery,
no plugin/runtime layer.

**Reconciliation renderers (PD4–PD7, user 2026-07-18) — added by the BSC6 code-vs-doc reconciliation:**

- **PD4 — OpenClaw emit (new renderer).** Verified surface: `~/.openclaw/openclaw.json` (**user-global**,
  the gateway is a machine-global daemon), JSON `mcp.servers`. OpenClaw's gateway *only* reads the global
  file — a project file is inert unless `OPENCLAW_CONFIG_PATH` redirects it. **Decision (user): emit a
  repo-local `./.openclaw/openclaw.json` anyway**, HTTP `transport: "streamable-http"`, value-free via `${VAR}` (officially documented for
  openclaw.json values; `mcp.servers`-scope applies by extension — carry a "confirm on first wire"
  caveat), **plus a mandatory `.rig/mcp-setup.md` wiring note** telling the user to
  `export OPENCLAW_CONFIG_PATH=./.openclaw/openclaw.json`. `credential_safety: manual_note_required`.
  *(Rejected — note-only (Bucket 4): the user wants a repo-pinned config. Rejected — emit with a literal
  secret: violates SC5.)* Source: docs.openclaw.ai/cli/mcp, /gateway/configuration, /help/environment.
- **PD5 — Devin emit (new JSON renderer).** Verified surface: **`.devin/config.json` — project scope,
  committed to VCS** (also `.devin/config.local.json` gitignored, `~/.config/devin/config.json` user).
  HTTP entries use `transport: "http"`. Value-free `${env:VAR}` / `${file:/path}`; no native `.env` loader (env var must be present in the
  process). This is a **clean Bucket 2 emit** (native committable project config) + manual load note —
  no wiring redirect needed. Reuses the PD2d read-or-init JSON merge. `credential_safety:
  manual_note_required`. Source: docs.devin.ai/cli/extensibility/mcp/configuration.
- **PD6 — CodeWhale reclassified note-only → emit (new renderer).** Re-verification found CodeWhale is
  user-global by default (`~/.codewhale/mcp.json`) **but** exposes a **file-path override**
  (`DEEPSEEK_MCP_CONFIG` env / `mcp_config_path` setting) **and** value-free syntax
  (`bearer_token_env_var`). Static headers take precedence, so the renderer must not also emit an
  `Authorization` header. By the PD7 rule, it flips to the OpenClaw shape: **emit
  `./.codewhale/mcp.json` + mandatory wiring note** (`export DEEPSEEK_MCP_CONFIG=…`). Upgrade path (not
  yet verified): CodeWhale auto-loads a `./.codewhale/config.toml` overlay; if `mcp_config_path` is an
  overlay-safe key, emitting that overlay removes the manual step (→ clean Bucket 2). `credential_safety:
  manual_note_required`. Source: github.com/Hmbown/CodeWhale docs/MCP.md + CONFIGURATION.md.
- **PD7 — The user-global-flip rule (general principle, decides Tier A vs Tier B).** A host whose MCP
  config defaults to `$HOME` emits a **repo-local** config (Tier A, emit + wiring note) **iff** it has
  BOTH (a) a documented **file-path override** that points at a specific repo file (env var or flag —
  e.g. `OPENCLAW_CONFIG_PATH`, `DEEPSEEK_MCP_CONFIG`), AND (b) a documented **value-free credential
  syntax**. It stays **Tier B (note-only)** if instead it has: only a **home-dir** override that
  relocates all state (not a clean repo pin, e.g. `COPILOT_HOME`); **no value-free syntax** (literal
  paste only); **no override at all**; or a project file that is **read but silently ignored**.
  Emitting a file the host ignores is forbidden (PD2d). Applied 2026-07-18 to the six user-global hosts:
  **flip → CodeWhale** (PD6). **Stay note-only → Hermes** (global-only, project MCP is open FR #23130, no
  file-path override), **Windsurf** (global-only, no project copy, no override), **Cline** (global-only,
  project MCP is open FR #2418), **GitHub Copilot CLI** (`COPILOT_HOME` relocates the whole home *and* no
  `${}` syntax → literal paste), **Antigravity** (native workspace `.agents/mcp_config.json`, but no
  documented value-free credential syntax). Sources: docs.windsurf.com; docs.cline.bot + cline #2418;
  docs.github.com copilot CLI; antigravity.google/docs/mcp; hermes-agent #23130.
- **PD8 — First-class user setup documentation for manual-wiring hosts (user 2026-07-18).** The manual
  step must be *easy*, not merely documented. `.rig/mcp-setup.md` (PD2c) ships **per-host, named,
  copy-pasteable** setup for every `manual_note_required` host: the exact wiring export for the override
  hosts (OpenClaw `export OPENCLAW_CONFIG_PATH=./.openclaw/openclaw.json`; CodeWhale
  `export DEEPSEEK_MCP_CONFIG=./.codewhale/mcp.json`), the native-loader-absent `.env` load step (SC4,
  e.g. `set -a; source .env; set +a` before launch), and the Codex "never paste the key" warning (SC5).
  Goal: the user follows one labeled block per host and the server is wired — no guesswork. *(Extends
  PD2c from "a note exists" to "the note is a sufficient, self-contained runbook.")*

**PD-open-4 clarification (conscious limit, user 2026-07-18).** OpenClaw and CodeWhale (PD4/PD6) emit a
repo-local config that is **inert until the user exports a config-path env var** (`OPENCLAW_CONFIG_PATH`,
`DEEPSEEK_MCP_CONFIG`) pointing a **machine-global** tool at it. This holds PD-open-4 **literally** — Rig
writes nothing outside the target repo; the export is a user action in their own shell — but activation
reaches a global tool. Accepted as a **conscious** trade (documented in PD4/PD6/PD7, made trivial by
PD8), not a blind spot: the alternative (note-only, no emitted repo file) was rejected because the user
wants a repo-pinned config.

## 8. Host MCP-emit verification matrix — COMPLETE (19/19, official docs only)

Three-axis, doc-backed verification per host (config file/format, token syntax, credential mechanism →
`credential_safety`). Evidence bar (PD-open-3): **official docs only** — vendor/project docs, repo docs,
or source config schema; issue trackers, third-party posts, and empirical-only tests may inform but do
not satisfy the gate. Verification walked the matrix in `docs/agent-portability.md` order, re-checking
every row from the top; **OpenClaw and Devin were appended (BSC6)** and the portability doc is now
reconciled to include both real adapters.

| Host | MCP config | Token syntax | Credential mechanism | `credential_safety` | Source |
|---|---|---|---|---|---|
| Claude Code | `.mcp.json` (project) | `${VAR}`, `${VAR:-default}` | expand in command/args/env/url/headers; no native `.env` loader | `manual_note_required` | SC |
| Codex | `config.toml` `[mcp_servers.*]` | none (no interpolation) | http `bearer_token_env_var`; stdio `env_vars` passthrough | `manual_note_required` | SC |
| OpenCode | `opencode.json` `mcp` block (`type: local`\|`remote`) | `{env:VAR}` (empty if unset) | local `environment` map; remote `headers` `Bearer {env:VAR}`; expands from process env, no `.env` loader | `manual_note_required` | opencode.ai/docs/mcp-servers + /docs/config |
| pi (oh-my-pi / OMP) | `.omp/mcp.json` (project) / `~/.omp/agent/mcp.json`; JSON `mcpServers` | `${VAR}`, `${VAR:-default}`; `env`/`headers` value naming an env var resolves from process env (`!cmd` runs a shell command) | name-based env references; **no** native `.env` loader | `manual_note_required` | github.com/can1357/oh-my-pi docs/mcp-config.md |
| Hermes Agent | `~/.hermes/config.yaml` (**user-global**); YAML `mcp_servers` | `${VAR}` in command/args/url + headers, resolved at connect time | `${VAR}` resolves from env incl. native `~/.hermes/.env`; OAuth tokens cached `~/.hermes/mcp-tokens/` (0600) | `manual_note_required` (value-free, but config + `.env` are user-global → PD-open-4 note only) | github.com/NousResearch/hermes-agent docs |
| Gemini CLI | `settings.json` `mcpServers` (`command`/`args`/`env`\|`httpUrl`) | `$VAR`/`${VAR}` (POSIX), `%VAR%` (Win); empty if unset | `env` block expands from process env; no `.env` loader | `manual_note_required` | github.com/google-gemini/gemini-cli docs/tools/mcp-server.md |
| Cursor | `.cursor/mcp.json` (project) | `${env:NAME}` | stdio `envFile`; http shell env | stdio `config_only_safe` / http `manual_note_required` | SC |
| Windsurf | `~/.codeium/mcp_config.json` (**user-global**); JSON `mcpServers` | `${env:VAR}` in command/args/env/serverUrl/url/headers | `${env:VAR}` from process env; no native `.env` loader; raw paste also allowed | `manual_note_required` (value-free capable, but user-global → PD-open-4 note only) | docs.windsurf.com/plugins/cascade/mcp |
| Cline | `~/.cline/mcp.json` (CLI) / VS Code globalStorage (**user-global**); JSON `mcpServers` (`streamableHttp` remote) | **none documented** (literal `env`/`headers`; guidance only "store secrets in env vars") | no documented interpolation or `.env` loader; value-free emission **unverified** | `manual_note_required` (user-global + no documented value-free syntax) | docs.cline.bot/mcp/mcp-overview |
| GitHub Copilot (VS Code) | `.vscode/mcp.json` (**project**) or user profile; JSON root `servers` + `inputs` | `${input:ID}` (masked prompt, stored), `${env:VAR}`, `${workspaceFolder}`, `${userHome}` | native project **`envFile`** (`"${workspaceFolder}/.env"`) + `${input:}` secure prompt; value-free | **`config_only_safe`** (project path + native `envFile`) | code.visualstudio.com/docs/agents/reference/mcp-configuration + docs.github.com copilot MCP |
| GitHub Copilot CLI | `~/.copilot/mcp-config.json` (**user-global**; `COPILOT_HOME` override); JSON `mcpServers` | **none documented** (raw `env`/`headers`) | no documented interpolation or `.env` loader | `manual_note_required` (user-global → note only) | docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers |
| Antigravity | `.agents/mcp_config.json` (**workspace**) or `~/.gemini/config/mcp_config.json` (**global**); JSON `mcpServers`; `serverUrl` + `authProviderType` for http | **none** (docs show raw token: "Replace YOUR_GITHUB_PAT…") | no documented interpolation or `.env` loader; use shell env for stdio and supported auth providers for remote servers | `manual_note_required` (workspace config exists, but no value-free credential syntax → note only) | antigravity.google/docs/mcp + github.com/github/github-mcp-server install-antigravity.md |
| CodeWhale | `~/.codewhale/mcp.json` default (user-global), **repo-local emit via `DEEPSEEK_MCP_CONFIG` / `mcp_config_path` file-path override** → emit `./.codewhale/mcp.json`; JSON `servers`/`mcpServers` | `bearer_token_env_var`; static headers take precedence over env-backed bearer auth | value-free `bearer_token_env_var`; no native `.env` loader; repo file read only after `DEEPSEEK_MCP_CONFIG` wiring (PD6/PD7) | `manual_note_required` (**emit + mandatory wiring note**, OpenClaw-style; PD6) | github.com/Hmbown/CodeWhale docs/MCP.md + CONFIGURATION.md |
| OpenClaw (ClawHub) | `~/.openclaw/openclaw.json` default (user-global daemon), **repo-local emit via `OPENCLAW_CONFIG_PATH` file-path override** → emit `./.openclaw/openclaw.json`; JSON `mcp.servers`, HTTP `transport: "streamable-http"` | `${VAR}` (documented for openclaw.json values; `mcp.servers`-scope by extension — confirm on first wire) | value-free `${VAR}`; repo file read only after `OPENCLAW_CONFIG_PATH` wiring (PD4/PD7) | `manual_note_required` (**emit + mandatory wiring note**; PD4) | docs.openclaw.ai/cli/mcp + /gateway/configuration + /help/environment |
| Devin CLI | **`.devin/config.json` — project scope, committed** (also `.devin/config.local.json` gitignored, `~/.config/devin/config.json` user); JSON, HTTP `transport: "http"` | `${env:VAR}`, `${file:/path}` | value-free name/path references; no native `.env` loader (env var must be present) | `manual_note_required` (**native project emit, clean Bucket 2**; PD5) | docs.devin.ai/cli/extensibility/mcp/configuration |
| Swival | `swival.toml` (`[mcp_servers.*]`) or `.swival/mcp.json` (`mcpServers`) — **project-local** | **none documented** (raw `env`/`headers`) | no documented interpolation or `.env` loader; value-free emission **unverified** | `manual_note_required` (project path emittable, but no documented value-free syntax → emit server sans secret + note) | swival.dev/pages/mcp.html |
| VS Code + Codex extension | shares Codex `config.toml` (`~/.codex/config.toml` \| `.codex/config.toml`, trusted) — **same target/renderer as Codex** | none (per Codex) | `env_vars` / `bearer_token_env_var` passthrough (per Codex) | `manual_note_required` (**maps onto the Codex renderer — no separate renderer**) | developers.openai.com/codex/mcp + /codex/ide |
| Kiro | `.kiro/settings/mcp.json` (**project**) / `~/.kiro/settings/mcp.json` (user; workspace precedence); JSON local/remote | `${VAR}` env references (docs: "use `${API_TOKEN}` instead of hardcoding") | `${VAR}` from env; no native `.env` loader | `manual_note_required` (project path emittable, value-free via `${VAR}`) | kiro.dev/docs/mcp/ + /configuration/ |
| Generic agents | **no MCP config surface** (instruction-only: `AGENTS.md` / `skills/*`) | n/a | n/a | **n/a — no MCP renderer** (covered by instruction payload) | docs/agent-portability.md |

**Buckets (the shape of the emit behavior) — 19 hosts (Cursor counts twice: stdio + http):**

1. **`config_only_safe` — native project `.env` loader / secure prompt → emit, NO note (2):**
   Cursor-stdio (`envFile`), GitHub Copilot/VS Code (`envFile` + `${input:}`).
2. **Native project-local, value-free `${VAR}` → emit repo file + `.rig/mcp-setup.md` note (9):**
   Claude, Codex, OpenCode, pi, Gemini CLI, Kiro, Cursor-http, **Devin** (PD5), VS Code + Codex
   extension (reuses Codex).
2b. **User-global default + file-path override + value-free syntax → emit repo file + mandatory wiring
   note (2):** **OpenClaw** (`OPENCLAW_CONFIG_PATH`, PD4), **CodeWhale** (`DEEPSEEK_MCP_CONFIG`, PD6).
   The OpenClaw/CodeWhale shape (PD7).
3. **Emittable project-local but no documented interpolation → emit server sans secret + note (1):**
   Swival.
4. **No safe repo-contained, value-free emit → note only (5):** Hermes, Windsurf, Cline, GitHub
   Copilot CLI, Antigravity (each per PD7 — see §7).
5. **No MCP surface (1):** Generic agents (no MCP renderer).

Tiers roll up to SUP (§2a): buckets 1+2+2b+3 = **13 Tier-A hosts (wired emit)** — the sub-entry counts
(2+9+2+1) total 14 because **Cursor spans buckets 1 (stdio) and 2 (http)**, i.e. one host, two variants;
bucket 4 = **5 Tier-B (note-only)**; bucket 5 = **1 Tier-C (instruction-only / no MCP)**. 13+5+1 = 19.

**Literal-paste caveat (Cline, Swival, Antigravity):** official docs document no value-free mechanism,
so their config/note cannot promise a value-free credential — the user supplies the secret directly.
**Portability-doc correction completed:** `docs/agent-portability.md` now includes **OpenClaw** and
**Devin**, no longer labels Antigravity, CodeWhale, or Swival as potentially no-MCP, and reserves the
no-MCP instruction-tier description for **Generic agents**. These Gate-1 corrections were authorized
by BSC6 and are covered by `tests/basic-doc-reconcile.test.js`.

## 9. Success criteria / acceptance (SC7)

**Authored and GREEN (SC7 decision, user 2026-07-18): Gate 1 is closed.** The criteria below are
executable acceptance tests — `tests/basic-acceptance.test.js` (AT-1, AT-2, AT-3, round-trip, `.env`
gitignored), `tests/basic-secret-guard.test.js` (AT-4 + tracked-`.env`), and
`tests/basic-uninstall.test.js` (AT-5 + chained-hook restore), with the frozen install seam and fixtures
in `tests/helpers/basic-install.js`. The build-owned `tests/basic-*.test.js` files extend that spine
across validation, payload gating, variants, renderers, merge, setup notes, guard behavior,
containment, architecture, docs, and uninstall merge. They run under `npm test` and are **GREEN** with
the materializer, guard, and uninstall implementation shipped. Per the gate contract (routing.md),
the frozen Gate-1 files remain unchanged; a wrong test returns to design rather than being edited.
The single **Gate-1 install seam** the tests assert against is `node rig/materialize.js --target <dir>
--manifest <config.json>` where the config carries `{ hosts, mcp_servers }` (§6); if the build wires a
different entry, it changes **only** `materialize()` in the helper, never the assertions (which pin
observable intent, not mechanism). Both `npm test` and the narrow Tier-1 regression gate
`npm run test:rig` are green.

- **Configurator works:** declare one MCP server + creds → materializer emits the correct config for
  each selected host, in that host's format, with name-only credentials.
- **No per-host server duplication:** one semantic server fans out by compatibility variant to every
  selected, verified host that can represent it; if a selected supported host cannot be covered by any
  variant, install fails with an actionable compatibility error.
- **AT-1 (writer clean):** `.env.example` = blank placeholders; no `.env` created; secret-scan over
  Rig's outputs clean. *(passes today — this is what lulled S4.)*
- **AT-2 (per-host loader present, value-free):** each emitted config uses that host's name-only
  mechanism (Cursor `envFile`/`${env:NAME}`, Claude `${VAR}`, Codex `bearer_token_env_var`/`env_vars`),
  never a literal value.
- **AT-3 (manual step documented where required):** Claude-CLI and Codex-stdio (and every
  `manual_note_required` host) emit a `.rig/mcp-setup.md` note naming the host and the load step.
- **AT-4 (target-repo guard blocks):** in a temp repo with Basic installed, committing a config with a
  fake `sk-…` key is **rejected**; the `${VAR}`/`envFile` reference form **passes**. Goes RED without
  the guard.
- **Manifest round-trips the Tier-1 payload:** the one-manifest emit reproduces the exact Tier-1
  markdown layout the copy list produced (no regression from retiring the copy list).
- **AT-5 (uninstall is repo-local and safe):** uninstall removes Rig's emitted MCP config, the
  `.rig/hooks/secret-guard.sh` + `pre-commit` shim, `.rig/mcp-setup.md`, and `.env.example`; **restores a
  pre-existing chained hook** (SC6d); and **leaves the user's `.env` untouched** (§10, PD-open-4).
- **No runtime, no secret in git:** installed repo starts no Rig process; `.env` gitignored.

## 10. Build completion and remaining verification

**Implementation checklist (completed in this build):**

- [x] Build the materializer at the **frozen Gate-1 install seam** `node rig/materialize.js --target
      <dir> --manifest <config.json>` (config = `{ hosts, mcp_servers }`, §6/§9). The authored
      acceptance tests and build-owned component tests are GREEN against exactly this seam.
- [x] Implement the secret guard to satisfy AT-4: precision floor (SC6c) + shim/chained hook (SC6d) +
      supplement-mode scanner (SC6e).
- [x] Reconcile `docs/agent-portability.md` — add OpenClaw + Devin rows; relabel Antigravity/CodeWhale/
      Swival "may have no MCP" (BSC6/BSC7).
- [x] Add the missing **Hermes** install section to README.es/ko (reverse-direction drift, BSC7).
- [x] Build the three net-new renderers — Devin (PD5), OpenClaw (PD4), CodeWhale (PD6).
- [x] Author the per-host `.rig/mcp-setup.md` setup runbook (wiring exports + `.env` load + Codex
      warning, PD8).
- [ ] **Manual first-wire verification remains:** confirm OpenClaw `${VAR}` interpolation inside
      `mcp.servers` and whether CodeWhale's `mcp_config_path` overlay can replace the
      `DEEPSEEK_MCP_CONFIG` export. Until externally confirmed, both setup blocks carry exact
      "confirm on first wire" caveats, asserted by `basic-setup-note.test.js`.

The shipped implementation includes the standalone host renderers, behavior-driving
`credential_safety`, non-destructive merge, semantic compatibility variants, canonical-manifest
payload migration, repo-local uninstall, guard chain, generated setup runbook, and README pointer.
The passing component tests trace each item in `basic-test-plan.md`.

## 11. Implementation record

Maps the shipped build to its governing decisions and acceptance gates. **No new decisions here.**
The frozen install seam every component targets is
`node rig/materialize.js --target <dir> --manifest <config.json>` (§9).

| # | Component | Build | Governed by | Acceptance gate | Depends on |
|---|---|---|---|---|---|
| C1 | **Manifest + validator** | JSON manifest model; zero-dep `validate()`; Rig's canonical manifest describing the Tier-1 payload as `copy`/`ensure_line` ops | PD-open-1, PD9, PD1(a–d), BSC5 | round-trip identity; `rig-bootstrap.test.js` stays green | — (foundation) |
| C2 | **Materializer core (payload pass)** | `rig/materialize.js` entry; parse+validate; run `copy`/`ensure_line`; host-gating | PD2f, §5, PD1d, PD9 | round-trip; payload assertions | C1 |
| C3 | **MCP emit generator** | second pass; variant assignment (greedy set-cover); `credential_safety` field; non-destructive merge; compat-error on uncoverable host | PD2a–f, PD3, **PD3a**, PD-open-5, SC2, SC5 | AT-2; no-duplication criterion | C2 |
| C4 | **Renderers (the matrix)** | Tier-A renderers: founding 3 (Claude/Cursor/Codex) first, then bucket 2/2b/3 incl. net-new **Devin/OpenClaw/CodeWhale**; VS Code+Codex ext reuses Codex; Tier-B note entries; Tier-C ack line | §8, PD4–PD7, SUP, PD-open-5/6 | AT-2 across hosts; §8 #7 gate (already met) | C3 |
| C5 | **Credential outputs** | `.env.example` (blank slots); `.env` gitignore; `.rig/mcp-setup.md` per-host runbook; `ensure_line README.md` | SC4, SC5, PD2c, **PD8** | AT-1, AT-3, `.env` gitignored | C3 |
| C6 | **Secret guard** | precision floor + tracked-`.env` block; `.rig/hooks/secret-guard.sh` + chained `pre-commit` shim; scanner supplement | SC6/6a, **SC6c/d/e** | AT-4 + AT-4b | C2 (install pass); else independent |
| C7 | **Uninstall** | remove materialized MCP config + hook + `.env.example`; restore chained hook; leave `.env` | §10, PD-open-4, SC6d | **AT-5 + AT-5b** (`basic-uninstall.test.js`) | C5, C6 |
| C8 | **Doc/code reconciliation** (Gate-1) | `agent-portability.md` OpenClaw/Devin rows + Antigravity/CodeWhale/Swival relabel; Hermes README.es/ko section | BSC6, **BSC7** | inspection / existing adapter tests | — (independent) |
| C9 | **First-wire verifications** | confirm OpenClaw `${VAR}`-in-`mcp.servers`; CodeWhale `mcp_config_path` overlay | PD4, PD6, PD8 | external doc/empirical confirm | alongside C4 |

**Acceptance-gate coverage** (every authored test maps to a component): AT-1 → C5; AT-2 → C3+C4;
AT-3 → C5; AT-4/AT-4b → C6; AT-5/AT-5b → C7; round-trip → C1+C2; `.env` gitignored / no-runtime → C5/C2.

**Dependency order used by the build plan:**
1. **C1 → C2** (foundation; turns the round-trip test green, keeps Tier-1 green).
2. Then three parallel tracks: **MCP** [C3 → C4 → C5], **guard** [C6] (independent of MCP emit),
   **docs** [C8] (independent of all code). **C9** rides alongside C4.
3. **C7 (uninstall)** after C5 + C6.

**Remaining verification limits:**
- **Uninstall (C7) is closed** — AT-5/AT-5b and merged-file/idempotence coverage are authored and GREEN
  in `tests/basic-uninstall.test.js` and `tests/basic-uninstall-merge.test.js`.
- **C9 verifications are unverified assumptions** carried as caveats (OpenClaw `${VAR}`-scope, CodeWhale
  overlay). Until confirmed, those two renderers ship on a "confirm on first wire" note (PD4/PD6), not a
  closed #7 gate.
- **Tier-B/C behavior is covered** by `tests/basic-renderers.test.js`: note-only hosts emit no MCP
  config, Generic gets one acknowledgment line, and VS Code + Codex reuses the Codex target.

## Decision index (every locked decision → one line)

| ID | Resolution |
|---|---|
| BSC1 | Identity = credentialed multi-host MCP configurator. |
| BSC2 | Materializer ships **with Basic** (load-bearing, not deferred). |
| BSC3 | ETL self-verify loop is **out** of Basic (proof-of-need only). |
| BSC4 | Emit for the **entire Ponytail adapter matrix** (amended 2026-07-18); #7-gated per renderer. |
| BSC5 | **One manifest** subsumes markdown payload + MCP defs; copy list retired (Option 2). |
| BSC6 | Authoritative host set = **shipped adapter code**; `agent-portability.md` reconciled to match — adds **OpenClaw** + **Devin** (matrix 17 → 19, Option B). |
| SUP | "Support" is **tiered** (§2a): A wired emit (12) / B note-only (5) / C instruction-only-no-MCP (2); "support all hosts" ≠ emitted config everywhere, by design. |
| BSC7 | Doc/code reconciliation **ships at build** (not a maybe): agent-portability.md OpenClaw/Devin rows + Antigravity/CodeWhale/Swival relabel (BSC6) **+ Hermes README install section** (reverse drift). |
| SC1 | Missing `.env`→env link is real and **not uniform** across hosts. |
| SC2 | MCP config is **per-host**, not one shared file. |
| SC3 | Close the loop with the host's **native loader** where it exists (Cursor `envFile`). |
| SC4 | Else ship an explicit **documented manual load step** (Claude CLI, Codex-stdio). |
| SC5 | **Never** value-shaped slots; steer Codex to `bearer_token_env_var`/`env_vars`. |
| SC6 / 6a / 6b | Runtime-free target-repo pre-commit secret guard: regex floor + gitleaks/trufflehog upgrade, fail-over. |
| SC6c | Floor is **high-precision** (curated secret-format prefixes + tracked-`.env` block), **not** entropy; recall delegated to the scanner tier (SC6a). Precision over recall — avoid training `--no-verify`. |
| SC6d | Hook = `.git/hooks/pre-commit` **shim** → committed `.rig/hooks/secret-guard.sh`; **chains** any existing hook; uninstall reverses. Honest limit: git hooks are **per-clone** (fresh clone re-runs Rig install). |
| SC6e | Scanner tier **supplements** the floor (floor always runs): prefer gitleaks→trufflehog, scan staged, non-zero=block; scanner exec error → floor verdict + warn (never fail-open, never block on broken tooling). |
| SC7 | Gate-1 acceptance tests AT-1…AT-5 + round-trip are **authored and GREEN** (§9); build-owned component tests are GREEN too. |
| PD1 (a–d) | Two payload ops + `mcp_servers` separate section + host-gating Option B + `.rig/skills` gating. |
| PD2a | Manifest = shared contract; standalone, repetitive, native renderers (no IR, no template engine). |
| PD2b | Explicit behavior-driving `credential_safety` enum, granular per (host × transport). |
| PD2c | `.rig/mcp-setup.md` notes file + one README pointer. |
| PD2d | Non-destructive merge into host-owned config files. |
| PD2e | 3-host ship scope **superseded** by full matrix; #7 gate survives. |
| PD2f | Generator is an install-time second pass that emits static files and exits. |
| PD3 | Semantic server declared **once** → compatibility variants → fan out; repo-only boundary; fail on uncoverable selected host. |
| PD3a | Variant assignment **maximizes hosts-per-variant / minimizes distinct variants** (unordered `variants[]` set, greedy set-cover, lexical tie-break); `representable` = transport-membership only (creds always name-only, SC5). |
| PD4 | **OpenClaw emit** (new renderer): repo-local `./.openclaw/openclaw.json`, value-free `${VAR}`, mandatory `OPENCLAW_CONFIG_PATH` wiring note. |
| PD5 | **Devin emit** (new JSON renderer): native committed `.devin/config.json`, `${env:VAR}`/`${file:}`, clean Bucket 2 + load note. |
| PD6 | **CodeWhale reclassified** note-only → emit: `./.codewhale/mcp.json` + `DEEPSEEK_MCP_CONFIG` wiring note (OpenClaw-style). |
| PD7 | **User-global-flip rule:** emit iff file-path override **and** value-free syntax; else note-only. Flips CodeWhale; keeps Hermes/Windsurf/Cline/Copilot-CLI/Antigravity note-only. |
| PD8 | `.rig/mcp-setup.md` = per-host copy-pasteable **setup runbook** (wiring exports, `.env` load, Codex warning) — make the manual step easy, not just documented. |
| PD9 | Manifest is **Rig-internal**; enforce with a **hand-written zero-dep `validate(manifest)`** (no JSON Schema/ajv) — required fields, `transport`/`credential_safety` enums, transport↔shape, name-only creds (SC5); **unknown host = hard error** (reversible default). |
| PD-open-1 | Manifest serialization = **JSON**. |
| PD-open-2 | Generator design ratified (PD2a–f). |
| PD-open-3 | Host scope = **entire Ponytail matrix**; verify in matrix order, re-check every row, **official docs only**. |
| PD-open-4 | The entire setup stays **contained to the target repo**; global-only hosts get a note, no `$HOME` write (Option A). **Clarified (§7):** emit-with-wiring hosts (OpenClaw/CodeWhale) hold this literally — Rig writes nothing outside the repo; the config-path export is a user action — accepted as a conscious limit. |
| PD-open-5 | Key file-emitting renderers **by config target** (VS Code+Codex ext reuses Codex); note-only hosts stay per-host (Option C). |
| PD-open-6 | No-MCP-surface host stays supported, no renderer, **one acknowledgment line** in `.rig/mcp-setup.md` (Option 2). |
