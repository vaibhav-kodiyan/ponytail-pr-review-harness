# Tier 2 Basic — Test / Verification Plan

Companion to `basic-design.md`. This plan says **how to prove the behavior that
design specifies actually holds** — nothing more. It is grounded in the tests
that already exist in this repo (`tests/basic-*.test.js`,
`tests/helpers/basic-install.js`) and records the coverage now shipped with the
build plus the two external first-wire checks that remain manual.

It does **not** re-argue any decision. Every row traces back to a locked
`BSC*/SC*/PD*` decision or an authored acceptance test (`AT-*`) in
`basic-design.md`.

---

## 0. Ground rules (do not violate)

1. **Frozen install seam.** Every automated test drives Basic through exactly
   one entry point: `node rig/materialize.js --target <dir> --manifest
   <config.json>` (and `--uninstall`). Reuse `tests/helpers/basic-install.js`
   (`materialize()`, `uninstall()`, `exampleServer`, `valueShaped`, `withRepo`,
   `walk`). If the build wires a different command, change **only** the helper,
   never a test body (§9 of the design).
2. **Gate contract.** The already-authored Gate-1 files — `basic-acceptance.test.js`,
   `basic-secret-guard.test.js`, `basic-uninstall.test.js` — are **frozen**. The
   implementer must not edit them. The additional coverage in this plan landed in
   separate **build-owned test files** (e.g. `basic-validator.test.js`). If a frozen
   test is genuinely wrong, it goes back to grilling — it is not edited to pass.
3. **RED → GREEN is the signal.** The Gate-1 files began RED on the missing
   `rig/materialize.js`; they and the build-owned component tests are now GREEN.
   `npm run test:rig` (Tier-1 regression) remains green.
4. **Runner = `node --test`** (built-in), matching every existing test file. No
   new test dependency (ponytail: the stdlib runner is already proven here).
   - Full suite: `npm test`
   - Tier-1 regression only: `npm run test:rig`

**Status legend used below**

| Tag | Meaning |
|---|---|
| ✅ **AUTHORED** | A passing Gate-1 or build-owned test asserts this behavior. |
| 🟡 **PARTIAL** | A test touches the area but only for a subset; the general case is unverified. |
| 🔴 **GAP** | Design specifies the behavior; **no** test exists. Build must add one (new file). |
| 🖐 **MANUAL** | Not automatable in-repo (external tool / first-wire confirm); verify by checklist. |

---

## 1. Traceability matrix (design behavior → test → status)

| # | Behavior (design ref) | Where proven | Status |
|---|---|---|---|
| C1 | Manifest `validate()`: required fields, `transport` enum, `credential_safety` enum, transport↔shape coupling, **name-only** creds, **unknown host = hard error** (PD9) | `basic-validator.test.js` | ✅ AUTHORED |
| C1/C2 | Round-trip: materializer reproduces Tier-1 payload byte-for-byte (BSC5, PD1d) | `basic-acceptance.test.js` round-trip | ✅ AUTHORED |
| C2 | Host-gating narrows the payload: `hosts:['claude']` prunes other hosts' adapters (PD1d Option B) | `basic-payload-gating.test.js` | ✅ AUTHORED |
| C2 | `.rig/skills/*` installs iff ≥1 instruction-only host selected; `.rig/routing.md`+`rules/ponytail.md` always (PD1a) | `basic-payload-gating.test.js` | ✅ AUTHORED |
| C3 | Variant assignment: greedy set-cover **minimizes distinct variants**, lexical-by-`id` tie-break, deterministic (PD3a) | `basic-variants.test.js` | ✅ AUTHORED |
| C3 | Uncoverable selected host ⇒ **install fails with actionable compatibility error, no silent skip** (PD3) | `basic-variants.test.js` | ✅ AUTHORED |
| C3 | One semantic server → **no per-host duplication** (SC2, PD3) | `basic-variants.test.js` | ✅ AUTHORED |
| C3/C4 | Per-host emit is native format + **name-only** reference, no literal value (SC5) — founding 3 | `basic-acceptance.test.js` AT-2 | ✅ AUTHORED |
| C4 | Same, for the remaining Tier-A hosts incl. net-new Devin/OpenClaw/CodeWhale (§8, PD4–PD7) | `basic-renderers.test.js` | ✅ AUTHORED |
| C4 | `credential_safety` granular per (host × transport): Cursor-stdio `config_only_safe` (envFile, **no note**) vs Cursor-http `manual_note_required` (PD2b) | `basic-renderers.test.js` | ✅ AUTHORED |
| C4 | Non-destructive merge: user's existing server entries preserved; re-install idempotent (PD2d) | `basic-merge.test.js` | ✅ AUTHORED |
| C4 | Tier-B note-only hosts emit **no** MCP config, only a `.rig/mcp-setup.md` note (SUP, PD7) | `basic-renderers.test.js` | ✅ AUTHORED |
| C4 | Tier-C: Generic gets **one ack line**, no renderer; VS Code+Codex ext reuses Codex target (PD-open-5/6) | `basic-renderers.test.js` | ✅ AUTHORED |
| C5 | `.env.example` = blank named slots, no `.env` created, outputs value-free (AT-1) | `basic-acceptance.test.js` AT-1 | ✅ AUTHORED |
| C5 | `.env` gitignored (`^\.env$`) | `basic-acceptance.test.js` | ✅ AUTHORED |
| C5 | `.rig/mcp-setup.md` names manual host + a load step (AT-3) — Claude/Codex | `basic-acceptance.test.js` AT-3 | ✅ AUTHORED |
| C5 | `.rig/mcp-setup.md` is a **per-host copy-pasteable runbook** incl. OpenClaw/CodeWhale wiring exports + Codex "never paste the key" (PD8, SC5) | `basic-setup-note.test.js` | ✅ AUTHORED |
| C5 | `ensure_line README.md` pointer (PD2c) | `basic-setup-note.test.js` | ✅ AUTHORED |
| C6 | Guard blocks a value-shaped `sk-…` key; passes a `${VAR}` reference (AT-4) | `basic-secret-guard.test.js` AT-4 | ✅ AUTHORED |
| C6 | Guard blocks a tracked `.env` even when force-added (AT-4b) | `basic-secret-guard.test.js` AT-4b | ✅ AUTHORED |
| C6 | Floor covers the **full curated prefix set** (`sk-ant`, `ghp_`, `gho_`, `AKIA…`, `xox[baprs]-`, PEM) (SC6c) | `basic-guard-floor.test.js` | ✅ AUTHORED |
| C6 | **Precision over recall**: floor does **not** flag high-entropy non-secrets (git SHA, base64 asset, lockfile digest, UUID) (SC6c) | `basic-guard-floor.test.js` | ✅ AUTHORED |
| C6 | Scanner tier: prefer `gitleaks`→`trufflehog`, scan **staged**, non-zero = block (SC6a/e) | `basic-guard-scanner.test.js` | ✅ AUTHORED |
| C6 | Scanner **exec error** ⇒ fall back to floor verdict + warn, **never fail-open** (SC6e) | `basic-guard-scanner.test.js` | ✅ AUTHORED |
| C6 | Shim **chains** an existing `pre-commit` (both run at commit time) (SC6d) | `basic-guard-chain.test.js` | ✅ AUTHORED |
| C7 | Uninstall removes emitted MCP config, hook, shim, `.rig/mcp-setup.md`, `.env.example`; **preserves `.env`** (AT-5) | `basic-uninstall.test.js` AT-5 | ✅ AUTHORED |
| C7 | Uninstall **restores** a pre-existing chained hook (AT-5b) | `basic-uninstall.test.js` AT-5b | ✅ AUTHORED |
| C7 | Uninstall of a **merged** host file removes only Rig's server entry, keeps the user's (PD2d inverse) | `basic-uninstall-merge.test.js` | ✅ AUTHORED |
| C8 | `docs/agent-portability.md` gains OpenClaw + Devin rows; Antigravity/CodeWhale/Swival relabeled; Hermes README.es/ko section added (BSC6/BSC7) | `basic-doc-reconcile.test.js` (grep-style) | ✅ AUTHORED |
| C9 | OpenClaw `${VAR}`-in-`mcp.servers` scope; CodeWhale `mcp_config_path` overlay upgrade (PD4/PD6) | first-wire checklist (§7) | 🖐 MANUAL |
| X | **No runtime** in installed repo; materializer exits (§5, #11) | `basic-containment.test.js` | ✅ AUTHORED |
| X | **No write outside the target repo** (PD-open-4) | `basic-containment.test.js` | ✅ AUTHORED |
| X | `rig/materialize.js` is a **thin CLI** delegating domain work to `rig/lib/*`; canonical payload stays in `rig/manifest.json` | `basic-architecture.test.js` | ✅ AUTHORED |

**Rollup:** 31 behaviors ✅ authored and GREEN, 0 🟡 partial, 0 🔴 gaps, 1 🖐 manual.
The suite now proves both the Gate-1 spine (round-trip, AT-1..5) and the design's
breadth: the wider host matrix, validator, set-cover, scanner tier, merge,
containment, architecture, and doc reconciliation.

---

## 2. Detailed test cases

Each case: **intent → precondition → steps → expected**. Automated cases name
the target file. IDs prefixed `TP-` are new; `AT-*` are the frozen authored ones.

### C1 — Manifest + validator (PD9) → `basic-validator.test.js`

The validator is a pure function over the parsed manifest; test it directly (no
filesystem) plus one end-to-end "bad manifest fails the CLI" case.

| ID | Intent | Input | Expected |
|---|---|---|---|
| TP-C1.1 | Required field missing | server with no `name` | validation error naming the field; non-zero exit |
| TP-C1.2 | `transport` enum | variant `transport:"grpc"` | error: transport must be `stdio`\|`http` |
| TP-C1.3 | `credential_safety` enum | `credential_safety:"safe"` | error: not a valid class |
| TP-C1.4 | Transport↔shape coupling (stdio) | stdio variant missing `command`/`args` | error: stdio needs command+args |
| TP-C1.5 | Transport↔shape coupling (http) | http variant missing `url` | error: http needs url |
| TP-C1.6 | **Name-only creds** (SC5) | `credentials:["sk-ant-real…"]` (value-shaped) | error: credentials must be env-var **names** |
| TP-C1.7 | **Unknown host = hard error** (PD9 default) | `hosts:["notahost"]` | install **fails** (not warn-skip); error names the host |
| TP-C1.8 | Valid manifest passes | `exampleServer`, `hosts:['claude']` | `validate()` returns clean; materialize succeeds |

> Rationale for TP-C1.7: a silent skip is "how you ship a config for a host you
> thought you selected" (PD9). The hard-error default must be pinned by a test so
> a future warn-and-skip flip is a conscious change, not a regression.

### C2 — Materializer core / payload pass → round-trip (authored) + `basic-payload-gating.test.js`

| ID | Intent | Steps | Expected |
|---|---|---|---|
| round-trip ✅ | Copy-list retirement is byte-identical | `bootstrap.sh --tier 1` vs `materialize({mcp_servers:[]})`; diff payload trees | every payload file + entrypoint identical (already asserted) |
| TP-C2.1 | Narrowing prunes adapters (PD1d Opt B) | `materialize(hosts:['claude'])` | `.claude/skills/rig-*` present; `.agents/skills`, `.cursor/rules`, `.kiro/steering`, `.windsurf`, `.clinerules` **absent** |
| TP-C2.2 | `.rig/skills/*` gating — native only | `hosts:['claude','codex']` (both native-skill) | `.rig/routing.md` + `.rig/rules/ponytail.md` present; `.rig/skills/*` **absent** |
| TP-C2.3 | `.rig/skills/*` gating — instruction host | `hosts:['claude','cursor']` (cursor is instruction-only) | `.rig/skills/{grilling,…,code-review}/SKILL.md` **present** |
| TP-C2.4 | Determinism | materialize twice into two dirs, same manifest | byte-identical trees (supports round-trip + variant tie-break) |

### C3 — MCP emit generator / variant assignment (PD3a) → `basic-variants.test.js`

Use purpose-built manifests, not just `exampleServer`, so the set-cover logic is
observable. A "renderer transport support" table is the input the cover reads.

| ID | Intent | Setup | Expected |
|---|---|---|---|
| TP-C3.1 | Min distinct variants (consolidation) | server with `stdio`+`http`; select several hosts that all support `stdio` | all land on the **same** variant; only 1 distinct variant used, not per-host scatter |
| TP-C3.2 | Cover still spans when needed | select a stdio-only host **and** an http-only host | 2 variants chosen (minimum that covers both) |
| TP-C3.3 | Lexical `id` tie-break | two variants cover the same host set | the one with the lexically-smaller `id` is chosen; deterministic across runs |
| TP-C3.4 | **Uncoverable host fails loud** (PD3) | http-only server + a stdio-only selected host | `materialize` **throws / non-zero**, message names the host + missing transport; **no partial emit left behind** |
| TP-C3.5 | **No per-host duplication** (SC2) | one server, N hosts | each host file has exactly **one** entry for the server; manifest never repeated per host |

### C4 — Renderers / the 19-host matrix (§8, PD4–PD7) → AT-2 (authored) + `basic-renderers.test.js`, `basic-merge.test.js`

**Founding 3 (AT-2, authored ✅):** `.mcp.json`, `.cursor/mcp.json`,
`.codex/config.toml` each exist, reference `EXAMPLE_DB_TOKEN` by name, use a
reference form (`${` / `_env_var` / `env_vars`), carry no literal secret.

Extend per bucket. One representative test per bucket keeps this lean (ponytail);
add a host only where its shape genuinely differs.

| ID | Bucket / host | Assert |
|---|---|---|
| TP-C4.1 | **1 — `config_only_safe`**: Cursor-stdio | emits `.cursor/mcp.json` with `envFile`; **no** manual note added for that host in `.rig/mcp-setup.md` |
| TP-C4.2 | 1 — GitHub Copilot / VS Code | `.vscode/mcp.json` with `envFile` + `${input:}`; config_only_safe (no note) |
| TP-C4.3 | **2 — value-free `${VAR}`**: Kiro, Gemini, OpenCode, pi | correct project path + `${VAR}`/`{env:VAR}` token; manual note present |
| TP-C4.4 | **2 — Devin (net-new, PD5)** | `.devin/config.json`, HTTP `transport: "http"`, `${env:VAR}`/`${file:}`, JSON read-or-init merge; manual note |
| TP-C4.5 | **2b — OpenClaw (net-new, PD4)** | `./.openclaw/openclaw.json`, HTTP `transport: "streamable-http"`, value-free `${VAR}` **+ mandatory** `export OPENCLAW_CONFIG_PATH=./.openclaw/openclaw.json` in the note |
| TP-C4.6 | **2b — CodeWhale (reclassified, PD6)** | `./.codewhale/mcp.json` uses `bearer_token_env_var` with no static `Authorization` header + **mandatory** `export DEEPSEEK_MCP_CONFIG=./.codewhale/mcp.json` in the note |
| TP-C4.7 | **3 — Swival** | project-local config emitted **without a secret** + note (no documented interpolation) |
| TP-C4.8 | **4 — Tier-B note-only** (Hermes, Windsurf, Cline, Copilot-CLI, Antigravity) | **no** MCP config file emitted for the host; a named note **is** present in `.rig/mcp-setup.md`; Antigravity names workspace `.agents/mcp_config.json` and global `~/.gemini/config/mcp_config.json` paths |
| TP-C4.9 | **5 — Generic (Tier-C)** | no renderer output; exactly **one** acknowledgment line in `.rig/mcp-setup.md` (PD-open-6) |
| TP-C4.10 | **2 — VS Code + Codex ext (Tier A)** | reuses the Codex renderer/target; **no** separate config file |
| TP-C4.11 | `credential_safety` drift guard (PD2b) | each host's emitted output matches its declared class (safe ⇒ loader + no note; manual ⇒ note) |

**Non-destructive merge (PD2d) → `basic-merge.test.js`**

| ID | Intent | Setup | Expected |
|---|---|---|---|
| TP-C4.12 | JSON host preserves user servers | pre-seed `.mcp.json` with `mcpServers.userThing` | after materialize: `userThing` **and** the Rig server both present |
| TP-C4.13 | Codex TOML append-if-absent | pre-seed `config.toml` with a `[mcp_servers.other]` block | Rig block appended; `other` untouched |
| TP-C4.14 | Idempotent re-install | materialize twice | second run adds **no** duplicate block/key; bytes stable |

### C5 — Credential outputs (SC4/SC5, PD2c, PD8) → AT-1/AT-3 (authored) + `basic-setup-note.test.js`

| ID | Intent | Assert |
|---|---|---|
| AT-1 ✅ | Writer clean | `.env.example` blank named slot; no `.env`; no value-shaped string in any emitted file |
| AT-3 ✅ | Manual note exists | `.rig/mcp-setup.md` names Claude + Codex + an actual load step |
| TP-C5.1 | PD8 runbook completeness | note has a **named, copy-pasteable block per `manual_note_required` host**: the SC4 `set -a; source .env; set +a` step, the two wiring exports (OpenClaw/CodeWhale), and the SC5 "never paste the key into `config.toml`" Codex warning |
| TP-C5.2 | README pointer (PD2c) | `ensure_line README.md` adds a single pointer line; re-install does not duplicate it; content stays **out** of `.env.example` / README body |
| TP-C5.3 | config_only_safe hosts get **no** note | a Cursor-stdio-only install adds no manual load step for Cursor (mirror of TP-C4.1) |

### C6 — Secret guard (SC6a/c/d/e) → AT-4/AT-4b (authored) + `basic-guard-*.test.js`

Drive through real `git commit` in a temp repo (as AT-4 does): the guard is a
`pre-commit` hook, so the commit succeeding/failing **is** the assertion.

**Floor precision → `basic-guard-floor.test.js`**

| ID | Intent | Staged content | Expected |
|---|---|---|---|
| AT-4 ✅ | Block `sk-ant`, pass `${VAR}` | `sk-ant-…` / `${EXAMPLE_DB_TOKEN}` | reject / allow |
| TP-C6.1 | Full curated prefix set blocks | one commit per: `ghp_…`, `gho_…`, `AKIA[0-9A-Z]{16}`, `xoxb-…`, `-----BEGIN … PRIVATE KEY-----` | each **blocked** (SC6c) |
| TP-C6.2 | All reference forms pass | `${VAR}`, `${env:NAME}`, `envFile:"${workspaceFolder}/.env"`, `bearer_token_env_var` | each **allowed** — this is the AT-4 green case generalized |
| TP-C6.3 | **Precision (no false positive)** | a 40-char git SHA, a base64 PNG blob, an `integrity: sha512-…` lockfile line, a UUID | each **allowed** — floor must not train users toward `--no-verify` (SC6c) |
| AT-4b ✅ | Tracked `.env` blocked | force-add `.env` | blocked even past `.gitignore` |

**Scanner tier → `basic-guard-scanner.test.js`** (manipulate `PATH` to inject stub scanners)

| ID | Intent | Setup | Expected |
|---|---|---|---|
| TP-C6.4 | Prefer gitleaks | stub `gitleaks` (exit non-zero) on `PATH` | commit blocked; gitleaks output surfaced; trufflehog not consulted |
| TP-C6.5 | Fall to trufflehog | only stub `trufflehog` on `PATH` | trufflehog used; block on its non-zero exit |
| TP-C6.6 | Scanner scans **staged** | stub records its args | invoked against staged content (e.g. `--staged`) |
| TP-C6.7 | **Exec error ⇒ floor + warn, never fail-open** | stub scanner exits with an *error* code that means "broken", on a clean-but-referenced file | commit **not** blocked by the broken scanner, floor verdict stands, a warning is emitted; and on a floor-flagged file it still blocks |
| TP-C6.8 | Floor always runs (SC6e) | scanner present **and** a floor-matching key staged | blocked by floor regardless of scanner verdict |

**Chained hook → `basic-guard-chain.test.js`**

| ID | Intent | Setup | Expected |
|---|---|---|---|
| TP-C6.9 | Existing hook still runs (SC6d) | pre-seed a `pre-commit` that `exit 1`s on a sentinel file | committing the sentinel is blocked by the **user's** hook after Rig install (shim chains, not overwrites) |

> AT-5b (authored) already proves the *restore* half of chaining on uninstall;
> TP-C6.9 proves the *runtime* half at commit time.

### C7 — Uninstall (§10, PD-open-4, SC6d) → AT-5/AT-5b (authored) + `basic-uninstall-merge.test.js`

| ID | Intent | Assert |
|---|---|---|
| AT-5 ✅ | Repo-local removal, `.env` preserved | removes `.mcp.json`, `.env.example`, `.rig/mcp-setup.md`, `.rig/hooks/secret-guard.sh`, `.git/hooks/pre-commit`; `.env` byte-identical |
| AT-5b ✅ | Chained hook restored | user's original `pre-commit` restored verbatim |
| TP-C7.1 | Merged-file uninstall (PD2d inverse) | pre-existing `.mcp.json` with a user server → after uninstall the **user's** server remains, only Rig's entry removed (file not deleted) |
| TP-C7.2 | Idempotent / safe re-run | uninstall twice, or on a repo where artifacts already absent | exits cleanly, no error, nothing user-owned touched |

> TP-C7.1 flags a real behavioral question the authored AT-5 doesn't cover:
> AT-5 has Rig *create* `.mcp.json`, so deleting the file is correct there. When
> Rig **merged** into a pre-existing file, uninstall must surgically remove only
> its entry. Confirm the intended behavior before implementing (do not assume
> "delete the file").

### C8 — Doc/code reconciliation (BSC6/BSC7) → `basic-doc-reconcile.test.js`

Cheap string-presence tests over the committed docs (design says "inspection").

| ID | Intent | Assert |
|---|---|---|
| TP-C8.1 | Matrix additions | `docs/agent-portability.md` contains OpenClaw **and** Devin rows |
| TP-C8.2 | Relabels | Antigravity, CodeWhale, Swival no longer carry the "instruction-tier, may have no MCP" note; only Generic does |
| TP-C8.3 | Reverse-drift fix | `README.es`/`README.ko` each contain a Hermes install section |

### C9 — First-wire verifications (PD4/PD6) → 🖐 MANUAL checklist

Not automatable in-repo; carry as a "confirm on first real wire" checklist, and
until confirmed these two renderers ship on a caveat note, **not** a closed #7
gate (design §11).

- [ ] OpenClaw: `${VAR}` actually expands **inside `mcp.servers`** scope (docs
      confirm it for top-level `openclaw.json` values; the `mcp.servers` scope is
      "by extension"). Verify against a live gateway.
- [ ] CodeWhale: whether `mcp_config_path` is an **overlay-safe** key — if so the
      manual `DEEPSEEK_MCP_CONFIG` export drops (clean Bucket 2 upgrade).

### X — Containment / non-goals (§5, #11, PD-open-4) → `basic-containment.test.js`

| ID | Intent | Method | Expected |
|---|---|---|---|
| TP-X.1 | **No write outside target repo** | run `materialize` with `HOME` (and `XDG_*`) pointed at an empty sentinel temp dir | sentinel dir stays empty; every write is under `--target` |
| TP-X.2 | **No runtime in installed repo** | after `materialize`, inspect the target | materializer process exited 0; no daemon/service/executable artifact beyond the git hook shim + committed `secret-guard.sh`; nothing self-launching |
| TP-X.3 | **All passes delegate** | inspect the committed CLI source | imports and invokes the config, payload, renderer, credential, guard, receipt, and uninstall module boundaries |
| TP-X.4 | **CLI stays thin** | inspect source size, declarations, and domain signatures | at most 120 lines; only argument parsing/orchestration functions; no host matrix, payload list, renderer, guard, scanner, credential, or uninstall implementation |
| TP-X.5 | **Canonical payload has one owner** | inspect `rig/manifest.json`, `rig/lib/payload.js`, and the CLI | manifest contains payload operations; payload module loads it; CLI does not duplicate payload constants |

---

## 3. Remaining verification limits

The in-repo coverage is complete for the behaviors in the traceability matrix.
The remaining limits are:

1. **C9 (OpenClaw/CodeWhale first-wire) cannot be closed in-repo.** Track as a
   manual gate; those renderers carry a caveat until confirmed.
2. **Scanner-tier tests depend on `PATH` stubbing, not the real tools.** That is
   correct and intentional (deterministic, no external install) — but it verifies
   Rig's *orchestration* of a scanner, not gitleaks/trufflehog detection quality.
   State that limit explicitly; do not claim the stub proves recall.
3. **Merged-file uninstall is resolved and covered.** TP-C7.1 pins the chosen
   behavior: remove only Rig's server entry and preserve the user's host file.

---

## 4. Build-owned test files

One file per component-area keeps failures legible and lets the parallel build
tracks (§11 sequence) land independently. All reuse `helpers/basic-install.js`.

```
tests/basic-validator.test.js        # C1  — TP-C1.*
tests/basic-payload-gating.test.js   # C2  — TP-C2.1..3  (round-trip already exists)
tests/basic-variants.test.js         # C3  — TP-C3.*
tests/basic-renderers.test.js        # C4  — TP-C4.1..11
tests/basic-merge.test.js            # C4  — TP-C4.12..14
tests/basic-setup-note.test.js       # C5  — TP-C5.*
tests/basic-guard-floor.test.js      # C6  — TP-C6.1..3
tests/basic-guard-scanner.test.js    # C6  — TP-C6.4..8
tests/basic-guard-chain.test.js      # C6  — TP-C6.9
tests/basic-uninstall-merge.test.js  # C7  — TP-C7.*
tests/basic-doc-reconcile.test.js    # C8  — TP-C8.*
tests/basic-containment.test.js      # X   — TP-X.*
tests/basic-architecture.test.js     # X   — TP-X.3..5
```

**Definition of done for the build:** satisfied. Every in-repo matrix behavior
has a passing test, `npm run test:rig && npm test` is green, and the two C9
renderers are explicitly flagged as caveated pending manual first-wire checks.
