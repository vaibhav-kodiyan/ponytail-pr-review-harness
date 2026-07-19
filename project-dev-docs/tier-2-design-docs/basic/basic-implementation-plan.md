# Tier 2 Basic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the credentialed multi-host MCP configurator — one Rig-owned manifest → a Node install-time materializer that emits per-host MCP config (name-only credentials), credential scaffolding, and a runtime-free target-repo secret guard — turning the nine RED acceptance tests GREEN without adding a runtime to the installed repo.

**Architecture:** A single install-time CLI, `rig/materialize.js`, replaces `rig/bootstrap.sh`'s fixed copy list. It runs a **payload pass** (data-driven `copy`/`ensure_line` from a Rig-owned canonical manifest, byte-identical to Tier-1) and, when the user config declares MCP servers, an **MCP emit pass** (semantic server → compatibility-variant fan-out → standalone per-host renderers), then writes credential scaffolding and installs a git pre-commit secret guard. It writes only inside the target repo, emits static files, and exits — no process, LLM, or secret value ever lands in the installed repo.

**Tech Stack:** Node.js built-ins only (`node:fs`, `node:path`, `node:child_process`, `node:test`, `node:assert`) — **zero runtime dependencies**. CommonJS (`require`), matching the existing repo. The secret guard is POSIX `sh`. Manifest + config are JSON.

## Global Constraints

*(Every task's requirements implicitly include this section. Values copied verbatim from the spec.)*

- **Frozen install seam — never change it.** `node rig/materialize.js --target <dir> --manifest <config.json>` and `node rig/materialize.js --target <dir> --uninstall`. The user config carries `{ hosts?, mcp_servers }`; **Rig owns the Tier-1 payload** (`tests/helpers/basic-install.js`, §9).
- **The implementer MUST NOT author or edit Gate-1 artifacts.** These files are frozen: `tests/basic-acceptance.test.js`, `tests/basic-secret-guard.test.js`, `tests/basic-uninstall.test.js`, `tests/helpers/basic-install.js`. If a test looks wrong, stop and return it to grilling (routing.md gate). All new tests you write go in **new** files you own.
- **Zero runtime dependencies.** Node built-ins only; no `ajv`, no JSON Schema, no YAML/TOML parser, no scanner library. (PD-open-1, PD9, PD2a, PD2d.)
- **No runtime in the installed repo.** The materializer runs at install time and exits; the installed repo runs no Rig process and no LLM (§5, #11).
- **No write outside the target repo** (PD-open-4). Global-only hosts get a note, never a `$HOME` write.
- **Never emit a value-shaped credential slot.** Every emitted config references credentials **by env-var name only** (SC5). No Rig-emitted file may contain a value-shaped literal — this includes the secret-guard script itself, so write detection patterns so the char after a prefix is a regex metaclass (`sk-[A-Za-z0-9_-]{16,}`, never a literal example key). `valueShaped` (the tests' oracle) is `/(?<![a-z0-9])sk-[a-z0-9-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/i`.
- **Secret guard = floor + tracked-`.env`, always; scanner supplements, never supersedes** (SC6b/c/e). Floor is **high-precision** (curated prefixes), not entropy (SC6c). Hook is a `.git/hooks/pre-commit` **shim** → committed `.rig/hooks/secret-guard.sh`, chains any existing hook, reversible (SC6d). Honest limit: hooks are per-clone.
- **Host verification = official docs only** (PD-open-3). The `credential_safety` per (host × transport) and each host's config path/token/mechanism are fixed by the §8 matrix in the design; encode that matrix, do not re-derive it.
- **Keep the narrow Tier-1 gate green throughout:** `npm run test:rig` (i.e. `tests/rig-bootstrap.test.js`) must stay GREEN at every commit. `npm test` is RED today (the nine Basic tests fail on missing `rig/materialize.js`) and goes fully GREEN only when this plan is complete.

## Reference: the design & the RED tests

- **Spec (single source of truth):** `project-dev-docs/tier-2-design-docs/basic/basic-design.md` (also attached as `.context/attachments/5FWzDU/basic-design.md`).
- **The nine RED tests map to tasks like this:**

| Test (frozen) | Assertion | Task that turns it GREEN |
|---|---|---|
| `basic-acceptance.test.js` → round-trip | materializer reproduces the Tier-1 payload byte-for-byte | Task 1 + Task 2 |
| `basic-acceptance.test.js` → AT-1 | `.env.example` blank, no `.env`, all outputs value-free | Task 5 (+ 2,3,4) |
| `basic-acceptance.test.js` → AT-2 | `.mcp.json` / `.cursor/mcp.json` / `.codex/config.toml` are native + name-only | Task 3 + Task 4a |
| `basic-acceptance.test.js` → AT-3 | `.rig/mcp-setup.md` names Claude & Codex + a load step | Task 5 |
| `basic-acceptance.test.js` → gitignored | `.gitignore` matches `/^\.env$/m` | Task 5 |
| `basic-secret-guard.test.js` → AT-4 | fake `sk-…` blocked, `${VAR}` passes | Task 6 |
| `basic-secret-guard.test.js` → AT-4b | force-added tracked `.env` blocked | Task 6 |
| `basic-uninstall.test.js` → AT-5 | removes MCP config/hook/setup/`.env.example`, keeps `.env` | Task 7 |
| `basic-uninstall.test.js` → AT-5b | restores a pre-existing chained pre-commit hook | Task 7 |

Run the whole Basic suite at any time with:
```bash
node --test tests/basic-acceptance.test.js tests/basic-secret-guard.test.js tests/basic-uninstall.test.js
```

---

## File Structure

**Create:**

- `rig/materialize.js` — CLI entry (the frozen seam). Parses `--target`, `--manifest`, `--uninstall`; orchestrates the passes; **thin**.
- `rig/manifest.json` — Rig-owned canonical **payload** manifest: the `copy`/`ensure_line` ops (with host tags + gates) that encode `bootstrap.sh`'s fixed list as data (BSC5, PD1a).
- `rig/lib/config.js` — load + `validate()` the user config `{ hosts?, mcp_servers }` (PD9); shared enums/constants.
- `rig/lib/payload.js` — load the canonical manifest; run the host-gated `copy`/`ensure_line` pass (byte-identical to bootstrap).
- `rig/lib/variants.js` — transport capability table; `representable()`; `assignVariants()` greedy set-cover (PD3a).
- `rig/lib/renderers.js` — standalone per-host MCP renderers; `credential_safety` table (host × transport); shared JSON/TOML non-destructive merge helpers (PD2a/b/d).
- `rig/lib/credentials.js` — `.env.example`, `.gitignore`, `.rig/mcp-setup.md` runbook (PD8), `README.md` pointer (PD2c).
- `rig/lib/guard.js` — the `secret-guard.sh` template + `.git/hooks/pre-commit` shim install with chained-hook backup (SC6).
- `rig/lib/receipt.js` — read/write `.rig/basic-receipt.json`, the install receipt uninstall reverses.
- `rig/lib/uninstall.js` — repo-local reversal driven by the receipt (Basic's OWN uninstall; not `scripts/uninstall.js`).
- New unit-test files you own: `tests/basic-payload.unit.test.js`, `tests/basic-variants.unit.test.js`, `tests/basic-validate.unit.test.js`, `tests/basic-guard.unit.test.js`.

**Modify (Task 8, doc-only):**

- `docs/agent-portability.md` — add OpenClaw + Devin rows; relabel Antigravity/CodeWhale/Swival.
- `README.es.md`, `README.ko.md` — add the missing Hermes install section.

**Never touch:** `rig/bootstrap.sh` (kept as the round-trip oracle), the four frozen Gate-1 test files, `scripts/uninstall.js`.

**Design note — one file per host vs one renderers file.** PD2a mandates *standalone, repetitive, native* renderers with **no shared IR / template engine**, but explicitly allows shared *mechanical* helpers (`renderCredentialSetupNote`, the read-or-init JSON merge). This plan keeps all renderers in one `rig/lib/renderers.js` sectioned one-function-per-host, sharing only the JSON/TOML file-merge primitives. If that file grows past ~400 lines, split by tier into `rig/lib/renderers/{tier-a,tier-b}.js` — a mechanical split, not an abstraction.

---

## Task 1: Canonical payload manifest + config validator

Foundation. Encodes `bootstrap.sh` as JSON data (`rig/manifest.json`) and builds the zero-dependency `validate()` (PD9). No emit yet.

**Files:**
- Create: `rig/manifest.json`
- Create: `rig/lib/config.js`
- Test: `tests/basic-validate.unit.test.js`

**Interfaces:**
- Produces (`rig/lib/config.js`):
  - `TRANSPORTS = ['stdio', 'http']`
  - `CREDENTIAL_SAFETY = ['config_only_safe', 'manual_note_required']`
  - `SUPPORTED_HOSTS` — the union of payload host tags and MCP renderer hosts (array of strings); the set an unknown-host error is checked against.
  - `loadUserConfig(manifestPath) -> { hosts: string[] | undefined, mcp_servers: Server[] }`
  - `validate(config) -> void` — throws `Error` with an actionable message on any violation; returns nothing on success.
  - A `Server` is `{ name: string, variants: Variant[] }`; a `Variant` is `{ id, transport, command?, args?, url?, credentials: string[] }`.
- Produces (`rig/manifest.json`): `{ pointer: string, payload: PayloadOp[] }` where `PayloadOp` is either `{ op: 'copy', from, to, host, gate? }` or `{ op: 'ensure_line', to, line, host }`. `gate` (optional) is `'instruction_only_selected'`.

- [ ] **Step 1: Write `rig/manifest.json`** — the exact `bootstrap.sh` list as data. `pointer` is the shared pointer string. Enumerate every op in `bootstrap.sh:67-101`:

```json
{
  "pointer": "Before acting, read `.rig/routing.md` and route this task through its skill table.",
  "payload": [
    { "op": "copy", "from": "rig/tier-1/routing.md", "to": ".rig/routing.md", "host": "neutral" },
    { "op": "copy", "from": "rig/tier-1/rules/ponytail.md", "to": ".rig/rules/ponytail.md", "host": "neutral" },

    { "op": "copy", "from": "rig/tier-1/skills/grilling/SKILL.md", "to": ".rig/skills/grilling/SKILL.md", "host": "neutral", "gate": "instruction_only_selected" },
    { "op": "copy", "from": "rig/tier-1/skills/product-design/SKILL.md", "to": ".rig/skills/product-design/SKILL.md", "host": "neutral", "gate": "instruction_only_selected" },
    { "op": "copy", "from": "skills/ponytail/SKILL.md", "to": ".rig/skills/ponytail/SKILL.md", "host": "neutral", "gate": "instruction_only_selected" },
    { "op": "copy", "from": "rig/tier-1/skills/execution/SKILL.md", "to": ".rig/skills/execution/SKILL.md", "host": "neutral", "gate": "instruction_only_selected" },
    { "op": "copy", "from": "rig/tier-1/skills/tdd/SKILL.md", "to": ".rig/skills/tdd/SKILL.md", "host": "neutral", "gate": "instruction_only_selected" },
    { "op": "copy", "from": "rig/tier-1/skills/debugging/SKILL.md", "to": ".rig/skills/debugging/SKILL.md", "host": "neutral", "gate": "instruction_only_selected" },
    { "op": "copy", "from": "rig/tier-1/skills/code-review/SKILL.md", "to": ".rig/skills/code-review/SKILL.md", "host": "neutral", "gate": "instruction_only_selected" },

    { "op": "copy", "from": ".claude/skills/rig-grilling/SKILL.md", "to": ".claude/skills/rig-grilling/SKILL.md", "host": "claude" },
    { "op": "copy", "from": ".claude/skills/rig-product-design/SKILL.md", "to": ".claude/skills/rig-product-design/SKILL.md", "host": "claude" },
    { "op": "copy", "from": ".claude/skills/rig-ponytail/SKILL.md", "to": ".claude/skills/rig-ponytail/SKILL.md", "host": "claude" },
    { "op": "copy", "from": ".claude/skills/rig-execution/SKILL.md", "to": ".claude/skills/rig-execution/SKILL.md", "host": "claude" },
    { "op": "copy", "from": ".claude/skills/rig-tdd/SKILL.md", "to": ".claude/skills/rig-tdd/SKILL.md", "host": "claude" },
    { "op": "copy", "from": ".claude/skills/rig-debugging/SKILL.md", "to": ".claude/skills/rig-debugging/SKILL.md", "host": "claude" },
    { "op": "copy", "from": ".claude/skills/rig-code-review/SKILL.md", "to": ".claude/skills/rig-code-review/SKILL.md", "host": "claude" },

    { "op": "copy", "from": ".agents/skills/rig-grilling/SKILL.md", "to": ".agents/skills/rig-grilling/SKILL.md", "host": "codex" },
    { "op": "copy", "from": ".agents/skills/rig-product-design/SKILL.md", "to": ".agents/skills/rig-product-design/SKILL.md", "host": "codex" },
    { "op": "copy", "from": ".agents/skills/rig-ponytail/SKILL.md", "to": ".agents/skills/rig-ponytail/SKILL.md", "host": "codex" },
    { "op": "copy", "from": ".agents/skills/rig-execution/SKILL.md", "to": ".agents/skills/rig-execution/SKILL.md", "host": "codex" },
    { "op": "copy", "from": ".agents/skills/rig-tdd/SKILL.md", "to": ".agents/skills/rig-tdd/SKILL.md", "host": "codex" },
    { "op": "copy", "from": ".agents/skills/rig-debugging/SKILL.md", "to": ".agents/skills/rig-debugging/SKILL.md", "host": "codex" },
    { "op": "copy", "from": ".agents/skills/rig-code-review/SKILL.md", "to": ".agents/skills/rig-code-review/SKILL.md", "host": "codex" },

    { "op": "ensure_line", "to": "CLAUDE.md", "line": "Before acting, read `.rig/routing.md` and route this task through its skill table.", "host": "claude" },
    { "op": "copy", "from": "rig/tier-1/adapters/cursor.mdc", "to": ".cursor/rules/rig.mdc", "host": "cursor" },
    { "op": "copy", "from": "rig/tier-1/adapters/pointer.md", "to": ".windsurf/rules/rig.md", "host": "windsurf" },
    { "op": "copy", "from": "rig/tier-1/adapters/pointer.md", "to": ".clinerules/rig.md", "host": "cline" },
    { "op": "copy", "from": "rig/tier-1/adapters/pointer.md", "to": ".agents/rules/rig.md", "host": "codex" },
    { "op": "copy", "from": "rig/tier-1/adapters/kiro.md", "to": ".kiro/steering/rig.md", "host": "kiro" },
    { "op": "ensure_line", "to": "AGENTS.md", "line": "Before acting, read `.rig/routing.md` and route this task through its skill table.", "host": "codex" },
    { "op": "ensure_line", "to": "GEMINI.md", "line": "Before acting, read `.rig/routing.md` and route this task through its skill table.", "host": "gemini" },
    { "op": "ensure_line", "to": ".github/copilot-instructions.md", "line": "Before acting, read `.rig/routing.md` and route this task through its skill table.", "host": "copilot" }
  ]
}
```

- [ ] **Step 2: Write the failing validator test** `tests/basic-validate.unit.test.js`:

```js
#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../rig/lib/config');
const { exampleServer } = require('./helpers/basic-install');

const ok = (extra) => ({ hosts: ['claude'], mcp_servers: [exampleServer], ...extra });

test('accepts a valid config', () => {
  assert.doesNotThrow(() => validate(ok()));
});

test('accepts hosts omitted (defaults to all supported)', () => {
  assert.doesNotThrow(() => validate({ mcp_servers: [] }));
});

test('rejects an unknown host (hard error, PD9)', () => {
  assert.throws(() => validate(ok({ hosts: ['claude', 'nope'] })), /nope/);
});

test('rejects a bad transport enum', () => {
  const bad = { name: 's', variants: [{ id: 'x', transport: 'grpc', url: 'https://e', credentials: ['T'] }] };
  assert.throws(() => validate({ hosts: ['claude'], mcp_servers: [bad] }), /transport/);
});

test('rejects transport/shape mismatch: stdio needs command', () => {
  const bad = { name: 's', variants: [{ id: 'x', transport: 'stdio', url: 'https://e', credentials: ['T'] }] };
  assert.throws(() => validate({ hosts: ['claude'], mcp_servers: [bad] }), /command|stdio/i);
});

test('rejects a value in credentials (name-only, SC5)', () => {
  const bad = { name: 's', variants: [{ id: 'x', transport: 'http', url: 'https://e', credentials: [['sk-', 'ant-api03-XXXXXXXXXXXXXXXXXXXX'].join('')] }] };
  assert.throws(() => validate({ hosts: ['claude'], mcp_servers: [bad] }), /name|value|credential/i);
});
```

- [ ] **Step 3: Run it to confirm RED**

Run: `node --test tests/basic-validate.unit.test.js`
Expected: FAIL — `Cannot find module '../rig/lib/config'`.

- [ ] **Step 4: Implement `rig/lib/config.js`**

```js
const fs = require('node:fs');

const TRANSPORTS = ['stdio', 'http'];
const CREDENTIAL_SAFETY = ['config_only_safe', 'manual_note_required'];

// Payload host tags (§6) ∪ MCP renderer hosts (§8). Unknown host = hard error (PD9).
const SUPPORTED_HOSTS = [
  // payload host tags
  'claude', 'codex', 'cursor', 'windsurf', 'cline', 'kiro', 'gemini', 'copilot',
  // MCP-only renderer hosts (§8 matrix ids)
  'opencode', 'pi', 'hermes', 'copilot-cli', 'antigravity', 'codewhale',
  'openclaw', 'devin', 'swival', 'vscode-codex', 'generic',
];

// A credential must be a bare env-var NAME. Reject anything value-shaped or non-identifier.
const NAME_ONLY = /^[A-Za-z_][A-Za-z0-9_]*$/;

function loadUserConfig(manifestPath) {
  const config = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (config.mcp_servers === undefined) config.mcp_servers = [];
  return config;
}

function validate(config) {
  if (!config || typeof config !== 'object') throw new Error('rig: config must be an object');
  const { hosts, mcp_servers } = config;

  if (hosts !== undefined) {
    if (!Array.isArray(hosts)) throw new Error('rig: hosts must be an array');
    for (const h of hosts) {
      if (!SUPPORTED_HOSTS.includes(h)) {
        throw new Error(`rig: unknown host "${h}" (supported: ${SUPPORTED_HOSTS.join(', ')})`);
      }
    }
  }

  if (!Array.isArray(mcp_servers)) throw new Error('rig: mcp_servers must be an array');
  for (const server of mcp_servers) {
    if (!server.name || typeof server.name !== 'string') throw new Error('rig: server.name is required');
    if (!Array.isArray(server.variants) || server.variants.length === 0) {
      throw new Error(`rig: server "${server.name}" needs at least one variant`);
    }
    for (const v of server.variants) {
      if (!v.id || typeof v.id !== 'string') throw new Error(`rig: variant in "${server.name}" needs an id`);
      if (!TRANSPORTS.includes(v.transport)) {
        throw new Error(`rig: variant "${v.id}" has invalid transport "${v.transport}" (${TRANSPORTS.join('|')})`);
      }
      if (v.transport === 'stdio' && !(v.command && Array.isArray(v.args))) {
        throw new Error(`rig: stdio variant "${v.id}" needs command + args`);
      }
      if (v.transport === 'http' && !v.url) {
        throw new Error(`rig: http variant "${v.id}" needs url`);
      }
      if (!Array.isArray(v.credentials)) throw new Error(`rig: variant "${v.id}" needs a credentials array`);
      for (const c of v.credentials) {
        if (typeof c !== 'string' || !NAME_ONLY.test(c)) {
          throw new Error(`rig: credential "${c}" in "${v.id}" must be an env-var NAME only (SC5)`);
        }
      }
    }
  }
}

module.exports = { TRANSPORTS, CREDENTIAL_SAFETY, SUPPORTED_HOSTS, loadUserConfig, validate };
```

- [ ] **Step 5: Run the validator test to confirm GREEN**

Run: `node --test tests/basic-validate.unit.test.js`
Expected: PASS (6/6).

- [ ] **Step 6: Commit**

```bash
git add rig/manifest.json rig/lib/config.js tests/basic-validate.unit.test.js
git commit -m "feat(rig): canonical payload manifest + zero-dep config validator (C1)"
```

---

## Task 2: Materializer core — payload pass + CLI seam

Wire the frozen CLI seam and run the payload pass byte-identically to `bootstrap.sh`. This turns the **round-trip** test GREEN and keeps Tier-1 green. No MCP emit yet.

**Files:**
- Create: `rig/lib/payload.js`
- Create: `rig/materialize.js`
- Test: `tests/basic-payload.unit.test.js`; the frozen round-trip in `tests/basic-acceptance.test.js`.

**Interfaces:**
- Consumes: `loadUserConfig`, `validate` (Task 1); `rig/manifest.json`.
- Produces (`rig/lib/payload.js`):
  - `ROOT` — absolute path to the Rig checkout root (`path.join(__dirname, '..', '..')`).
  - `INSTRUCTION_ONLY = ['cursor', 'windsurf', 'cline', 'kiro', 'gemini', 'copilot']`
  - `PAYLOAD_HOSTS = ['claude','codex','cursor','windsurf','cline','kiro','gemini','copilot']` — the hosts the payload has entries for; the default when `hosts` is omitted.
  - `loadCanonicalManifest() -> { pointer, payload }`
  - `copyOp(target, from, to) -> void`
  - `ensureLine(target, to, line) -> void` (byte-identical to bootstrap's `grep -Fqx || printf '\n%s\n'`)
  - `runPayload(target, hosts) -> void` — filters ops by host selection + `gate`, executes them.
- Produces (`rig/materialize.js`): the CLI. `--target <dir>` + `--manifest <file>` runs install; `--target <dir> --uninstall` runs uninstall (stubbed until Task 7).

- [ ] **Step 1: Write the failing payload unit test** `tests/basic-payload.unit.test.js`:

```js
#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ensureLine } = require('../rig/lib/payload');
const { withRepo } = require('./helpers/basic-install');

const pointer = 'Before acting, read `.rig/routing.md` and route this task through its skill table.';

test('ensureLine appends "\\n<line>\\n" when absent (bootstrap identity)', () => {
  withRepo((target) => {
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), '# Claude\n');
    ensureLine(target, 'CLAUDE.md', pointer);
    assert.equal(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf8'), `# Claude\n\n${pointer}\n`);
  });
});

test('ensureLine is idempotent', () => {
  withRepo((target) => {
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), '# Claude\n');
    ensureLine(target, 'CLAUDE.md', pointer);
    ensureLine(target, 'CLAUDE.md', pointer);
    assert.equal(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf8').split(pointer).length - 1, 1);
  });
});

test('ensureLine creates a missing file as "\\n<line>\\n"', () => {
  withRepo((target) => {
    ensureLine(target, 'GEMINI.md', pointer);
    assert.equal(fs.readFileSync(path.join(target, 'GEMINI.md'), 'utf8'), `\n${pointer}\n`);
  });
});
```

- [ ] **Step 2: Run it to confirm RED**

Run: `node --test tests/basic-payload.unit.test.js`
Expected: FAIL — `Cannot find module '../rig/lib/payload'`.

- [ ] **Step 3: Implement `rig/lib/payload.js`**

```js
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const INSTRUCTION_ONLY = ['cursor', 'windsurf', 'cline', 'kiro', 'gemini', 'copilot'];
const PAYLOAD_HOSTS = ['claude', 'codex', 'cursor', 'windsurf', 'cline', 'kiro', 'gemini', 'copilot'];

function loadCanonicalManifest() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'rig', 'manifest.json'), 'utf8'));
}

function copyOp(target, from, to) {
  const dst = path.join(target, to);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(ROOT, from), dst); // exact bytes, like `cp`
}

// Byte-for-byte equivalent of bootstrap.sh's ensure_line:
//   touch file; grep -Fqx "$line" file || printf '\n%s\n' "$line" >> file
function ensureLine(target, to, line) {
  const file = path.join(target, to);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!body.split('\n').includes(line)) {
    fs.writeFileSync(file, body + '\n' + line + '\n');
  }
}

function runPayload(target, hosts) {
  const selected = hosts && hosts.length ? hosts : PAYLOAD_HOSTS;
  const anyInstructionOnly = INSTRUCTION_ONLY.some((h) => selected.includes(h));
  const { payload } = loadCanonicalManifest();

  for (const entry of payload) {
    if (entry.host !== 'neutral' && !selected.includes(entry.host)) continue;
    if (entry.gate === 'instruction_only_selected' && !anyInstructionOnly) continue;
    if (entry.op === 'copy') copyOp(target, entry.from, entry.to);
    else if (entry.op === 'ensure_line') ensureLine(target, entry.to, entry.line);
  }
}

module.exports = { ROOT, INSTRUCTION_ONLY, PAYLOAD_HOSTS, loadCanonicalManifest, copyOp, ensureLine, runPayload };
```

- [ ] **Step 4: Run the payload unit test to confirm GREEN**

Run: `node --test tests/basic-payload.unit.test.js`
Expected: PASS (3/3).

- [ ] **Step 5: Implement `rig/materialize.js`** (the frozen CLI seam)

```js
#!/usr/bin/env node
const fs = require('node:fs');
const { loadUserConfig, validate } = require('./lib/config');
const { runPayload } = require('./lib/payload');

function parseArgs(argv) {
  const args = { target: null, manifest: null, uninstall: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--target') args.target = argv[++i];
    else if (argv[i] === '--manifest') args.manifest = argv[++i];
    else if (argv[i] === '--uninstall') args.uninstall = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target || !fs.existsSync(args.target)) {
    console.error('rig: --target <dir> is required and must exist');
    process.exit(2);
  }

  if (args.uninstall) {
    require('./lib/uninstall').uninstall(args.target); // wired in Task 7
    return;
  }

  if (!args.manifest) {
    console.error('rig: --manifest <config.json> is required');
    process.exit(2);
  }

  const config = loadUserConfig(args.manifest);
  validate(config);

  runPayload(args.target, config.hosts);

  if (config.mcp_servers.length > 0) {
    // Task 3-6 passes are wired here as they land:
    //   const receipt = require('./lib/renderers').renderMcp(args.target, config);
    //   require('./lib/credentials').writeCredentialOutputs(args.target, config, receipt);
    //   require('./lib/guard').installGuard(args.target, receipt);
    //   require('./lib/receipt').writeReceipt(args.target, receipt);
  }
}

main();
```

> Note: the `require('./lib/uninstall')` line will throw until Task 7 creates that module. That is fine — no test exercises `--uninstall` before Task 7. Do not stub it with dead code; wire the passes and the uninstall module in their own tasks.

- [ ] **Step 6: Run the frozen round-trip test to confirm GREEN**

Run: `node --test --test-name-pattern='round-trip' tests/basic-acceptance.test.js`
Expected: PASS — the materializer reproduces the Tier-1 payload byte-for-byte.

- [ ] **Step 7: Confirm the Tier-1 gate is still GREEN**

Run: `npm run test:rig`
Expected: PASS (2/2) — `bootstrap.sh` is untouched.

- [ ] **Step 8: Commit**

```bash
git add rig/lib/payload.js rig/materialize.js tests/basic-payload.unit.test.js
git commit -m "feat(rig): materializer payload pass + CLI seam; round-trip green (C2)"
```

---

## Task 3: MCP emit — variant assignment (greedy set-cover)

Build PD3a: a semantic server's unordered `variants[]` fan out to the **fewest distinct variants** covering all selected representable Tier-A hosts. Uncoverable selected Tier-A host → actionable compat error. Pure function; no file I/O.

**Files:**
- Create: `rig/lib/variants.js`
- Test: `tests/basic-variants.unit.test.js`

**Interfaces:**
- Produces:
  - `SUPPORTED_TRANSPORTS` — `Record<host, ('stdio'|'http')[]>` for every Tier-A renderer host (from §8; e.g. `claude: ['stdio','http']`, `cursor: ['stdio','http']`, `codex: ['stdio','http']`, `devin: ['stdio','http']`, `swival: ['stdio','http']`, …). Note-only/no-MCP hosts are absent.
  - `representable(host, variant) -> boolean` — `variant.transport ∈ SUPPORTED_TRANSPORTS[host]` (credentials are always name-only, so `credential_safety` never blocks representability — PD3a).
  - `assignVariants(server, tierAHosts) -> Map<host, variant>` — greedy set-cover; deterministic lexical-by-`id` tie-break; **throws** `Error` naming the server + host if a selected Tier-A host is representable by no variant.

- [ ] **Step 1: Write the failing test** `tests/basic-variants.unit.test.js`:

```js
#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const { assignVariants } = require('../rig/lib/variants');
const { exampleServer } = require('./helpers/basic-install');

test('consolidates all-capable hosts onto one variant, lexical tie-break', () => {
  // claude/cursor/codex each support stdio+http; both variants cover all 3, so
  // one variant is chosen; ids are "http" and "stdio" → "http" wins the tie.
  const assigned = assignVariants(exampleServer, ['claude', 'cursor', 'codex']);
  const ids = new Set([...assigned.values()].map((v) => v.id));
  assert.equal(ids.size, 1, 'a single variant covers all three hosts');
  assert.equal([...ids][0], 'http', 'lexical tie-break picks "http" over "stdio"');
  assert.equal(assigned.size, 3);
});

test('throws an actionable compat error for an uncoverable Tier-A host', () => {
  const httpOnly = { name: 'x', variants: [{ id: 'http', transport: 'http', url: 'https://e', credentials: ['T'] }] };
  // Fabricate a Tier-A host that supports only stdio to force the failure path.
  const variants = require('../rig/lib/variants');
  const original = variants.SUPPORTED_TRANSPORTS.codex;
  variants.SUPPORTED_TRANSPORTS.codex = ['stdio'];
  try {
    assert.throws(() => assignVariants(httpOnly, ['codex']), /codex/);
  } finally {
    variants.SUPPORTED_TRANSPORTS.codex = original;
  }
});
```

- [ ] **Step 2: Run it to confirm RED**

Run: `node --test tests/basic-variants.unit.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `rig/lib/variants.js`**

```js
// Per §8: transports each Tier-A renderer host can represent. Note-only (Tier-B)
// and no-MCP (Tier-C) hosts are intentionally absent — they never take a variant.
const SUPPORTED_TRANSPORTS = {
  claude: ['stdio', 'http'],
  codex: ['stdio', 'http'],
  cursor: ['stdio', 'http'],
  opencode: ['stdio', 'http'],
  pi: ['stdio', 'http'],
  gemini: ['stdio', 'http'],
  kiro: ['stdio', 'http'],
  devin: ['stdio', 'http'],
  openclaw: ['stdio', 'http'],
  codewhale: ['stdio', 'http'],
  swival: ['stdio', 'http'],
  'vscode-codex': ['stdio', 'http'], // reuses the Codex renderer
};

function representable(host, variant) {
  const transports = SUPPORTED_TRANSPORTS[host] || [];
  return transports.includes(variant.transport);
}

// Greedy set-cover (PD3a): repeatedly take the variant covering the most
// still-unassigned hosts; deterministic lexical-by-id tie-break.
function assignVariants(server, tierAHosts) {
  const unassigned = new Set(tierAHosts);
  const assigned = new Map();
  const variants = [...server.variants].sort((a, b) => a.id.localeCompare(b.id));

  while (unassigned.size > 0) {
    let best = null;
    let bestCovered = [];
    for (const variant of variants) {
      const covered = [...unassigned].filter((h) => representable(h, variant));
      if (covered.length > bestCovered.length) {
        best = variant;
        bestCovered = covered;
      }
    }
    if (!best || bestCovered.length === 0) {
      const stuck = [...unassigned].join(', ');
      throw new Error(
        `rig: server "${server.name}" cannot be represented for selected host(s): ${stuck}. ` +
        `Add a compatible variant (${Object.keys(SUPPORTED_TRANSPORTS).length} hosts, transports stdio|http).`,
      );
    }
    for (const h of bestCovered) {
      assigned.set(h, best);
      unassigned.delete(h);
    }
  }
  return assigned;
}

module.exports = { SUPPORTED_TRANSPORTS, representable, assignVariants };
```

- [ ] **Step 4: Run the variants test to confirm GREEN**

Run: `node --test tests/basic-variants.unit.test.js`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add rig/lib/variants.js tests/basic-variants.unit.test.js
git commit -m "feat(rig): PD3a variant assignment (greedy set-cover) + compat error (C3)"
```

---

## Task 4a: Founding-three renderers (Claude / Cursor / Codex) + emit driver

The three renderers AT-2 gates, plus the driver that runs assignment → per-host render → returns receipt data. This turns **AT-2** GREEN (Claude `.mcp.json`, Cursor `.cursor/mcp.json`, Codex `.codex/config.toml`).

**Files:**
- Create: `rig/lib/renderers.js`
- Wire: `rig/materialize.js` (uncomment the `renderMcp` line).

**Interfaces:**
- Consumes: `assignVariants` (Task 3); `withRepo`, `exampleServer` fixtures.
- Produces (`rig/lib/renderers.js`):
  - `HOST_TIER: Record<host, 'A'|'B'|'C'>` — every host in `SUPPORTED_HOSTS`.
  - `CREDENTIAL_SAFETY: Record<`${host}:${transport}`, 'config_only_safe'|'manual_note_required'>` (from §8; e.g. `'cursor:stdio': 'config_only_safe'`, `'cursor:http': 'manual_note_required'`, `'claude:*'`/`'codex:*'`: `manual_note_required`).
  - `mergeJson(filePath, mutate) -> void` — read-or-init `{}`, apply `mutate(obj)`, write 2-space JSON (PD2d, non-destructive).
  - `appendTomlBlock(filePath, header, body) -> void` — append `\n[header]\n<body>` iff the exact `[header]` line is absent (grep-guard; no TOML serializer).
  - `renderMcp(target, config) -> Receipt` where `Receipt = { ownedFiles: string[], mergedEntries: Array<{file, serverName}>, noteHosts: string[], credentialNames: string[] }`.

- [ ] **Step 1: Confirm AT-2 is RED**

Run: `node --test --test-name-pattern='AT-2' tests/basic-acceptance.test.js`
Expected: FAIL — the three config files don't exist yet.

- [ ] **Step 2: Implement `rig/lib/renderers.js`** (founding three + driver)

```js
const fs = require('node:fs');
const path = require('node:path');
const { SUPPORTED_HOSTS } = require('./config');
const { assignVariants } = require('./variants');

const HOST_TIER = Object.fromEntries(SUPPORTED_HOSTS.map((h) => [h, 'B'])); // default; overridden below
Object.assign(HOST_TIER, {
  claude: 'A', codex: 'A', cursor: 'A', opencode: 'A', pi: 'A', gemini: 'A',
  kiro: 'A', devin: 'A', openclaw: 'A', codewhale: 'A', swival: 'A', 'vscode-codex': 'A',
  hermes: 'B', 'copilot-cli': 'B', antigravity: 'B', windsurf: 'B', cline: 'B', copilot: 'B',
  generic: 'C',
});

// Per (host × transport), from §8. Drives note inclusion + Cursor's envFile emit.
const CREDENTIAL_SAFETY = {
  'claude:stdio': 'manual_note_required', 'claude:http': 'manual_note_required',
  'codex:stdio': 'manual_note_required', 'codex:http': 'manual_note_required',
  'cursor:stdio': 'config_only_safe', 'cursor:http': 'manual_note_required',
  // ...remaining Tier-A hosts filled in Task 4b, all manual_note_required except
  //    'copilot-vscode:*' (config_only_safe) if/when that host is added.
};

function mergeJson(filePath, mutate) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let obj = {};
  if (fs.existsSync(filePath)) {
    try { obj = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { obj = {}; }
  }
  mutate(obj);
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n');
}

function appendTomlBlock(filePath, header, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (existing.split('\n').includes(`[${header}]`)) return; // already present
  const sep = existing && !existing.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(filePath, existing + sep + `\n[${header}]\n${body}`);
}

// ---- Founding-three renderers. Each returns the relative file it owns/merged. ----

// Claude Code — .mcp.json (project), ${VAR} in url/headers or command/env.
function renderClaude(target, server, variant) {
  const file = '.mcp.json';
  const entry = variant.transport === 'http'
    ? { type: 'http', url: variant.url, headers: authHeader('${%s}', variant) }
    : { command: variant.command, args: variant.args, env: envMap('${%s}', variant) };
  mergeJson(path.join(target, file), (o) => { (o.mcpServers ??= {})[server.name] = entry; });
  return { file, merged: server.name };
}

// Cursor — .cursor/mcp.json, ${env:NAME}; stdio adds native envFile (config_only_safe).
function renderCursor(target, server, variant) {
  const file = '.cursor/mcp.json';
  const entry = variant.transport === 'http'
    ? { url: variant.url, headers: authHeader('${env:%s}', variant) }
    : { command: variant.command, args: variant.args, env: envMap('${env:%s}', variant), envFile: '${workspaceFolder}/.env' };
  mergeJson(path.join(target, file), (o) => { (o.mcpServers ??= {})[server.name] = entry; });
  return { file, merged: server.name };
}

// Codex — .codex/config.toml [mcp_servers.<name>]; bearer_token_env_var (http) / env_vars (stdio).
function renderCodex(target, server, variant) {
  const file = '.codex/config.toml';
  const cred = variant.credentials[0];
  const body = variant.transport === 'http'
    ? `url = "${variant.url}"\nbearer_token_env_var = "${cred}"\n`
    : `command = "${variant.command}"\nargs = [${variant.args.map((a) => `"${a}"`).join(', ')}]\nenv_vars = [${variant.credentials.map((c) => `"${c}"`).join(', ')}]\n`;
  appendTomlBlock(path.join(target, file), `mcp_servers.${server.name}`, body);
  return { file, merged: server.name };
}

// Helpers shared by renderers (mechanical, not an IR).
function authHeader(tokenFmt, variant) {
  return { Authorization: `Bearer ${tokenFmt.replace('%s', variant.credentials[0])}` };
}
function envMap(tokenFmt, variant) {
  return Object.fromEntries(variant.credentials.map((c) => [c, tokenFmt.replace('%s', c)]));
}

const RENDERERS = {
  claude: renderClaude,
  cursor: renderCursor,
  codex: renderCodex,
  'vscode-codex': renderCodex, // PD-open-5: reuses the Codex renderer/target
  // Task 4b adds: opencode, pi, gemini, kiro, devin, openclaw, codewhale, swival
};

function renderMcp(target, config) {
  const hosts = config.hosts && config.hosts.length ? config.hosts : SUPPORTED_HOSTS;
  const receipt = { ownedFiles: [], mergedEntries: [], noteHosts: [], credentialNames: [] };
  const names = new Set();

  const tierA = hosts.filter((h) => HOST_TIER[h] === 'A' && RENDERERS[h]);

  for (const server of config.mcp_servers) {
    const assigned = assignVariants(server, tierA);
    for (const [host, variant] of assigned) {
      const before = fs.existsSync(path.join(target, fileFor(host)));
      const { file, merged } = RENDERERS[host](target, server, variant);
      // A file Rig created is owned (deletable); a pre-existing one is merged.
      if (!before) recordOwned(receipt, file); else receipt.mergedEntries.push({ file, serverName: merged });
      if (CREDENTIAL_SAFETY[`${host}:${variant.transport}`] === 'manual_note_required' && !receipt.noteHosts.includes(host)) {
        receipt.noteHosts.push(host);
      }
      for (const c of variant.credentials) names.add(c);
    }
  }

  // Tier-B hosts (note-only) and Tier-C (ack line) are recorded so the runbook
  // covers them even though no config file is emitted (Task 4c / Task 5).
  for (const h of hosts) {
    if (HOST_TIER[h] === 'B' && !receipt.noteHosts.includes(h)) receipt.noteHosts.push(h);
  }
  receipt.credentialNames = [...names];
  receipt.tierC = hosts.filter((h) => HOST_TIER[h] === 'C');
  return receipt;
}

// The single-file target each renderer owns (for the created-vs-merged check).
function fileFor(host) {
  return { claude: '.mcp.json', cursor: '.cursor/mcp.json', codex: '.codex/config.toml', 'vscode-codex': '.codex/config.toml' }[host]
    || rendererFileFor(host); // Task 4b hosts
}
function rendererFileFor() { return null; } // replaced in Task 4b
function recordOwned(receipt, file) { if (!receipt.ownedFiles.includes(file)) receipt.ownedFiles.push(file); }

module.exports = { HOST_TIER, CREDENTIAL_SAFETY, mergeJson, appendTomlBlock, renderMcp, RENDERERS, fileFor };
```

- [ ] **Step 3: Wire the driver into `rig/materialize.js`** — inside the `mcp_servers.length > 0` block, add:

```js
    const receipt = require('./lib/renderers').renderMcp(args.target, config);
```

- [ ] **Step 4: Run AT-2 to confirm GREEN**

Run: `node --test --test-name-pattern='AT-2' tests/basic-acceptance.test.js`
Expected: PASS — `.mcp.json`, `.cursor/mcp.json`, `.codex/config.toml` each reference `EXAMPLE_DB_TOKEN` by name, use a reference form (`${...}` / `_env_var`), and carry no literal secret.

- [ ] **Step 5: Confirm no regression**

Run: `node --test --test-name-pattern='round-trip' tests/basic-acceptance.test.js && npm run test:rig`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add rig/lib/renderers.js rig/materialize.js
git commit -m "feat(rig): founding-3 MCP renderers + emit driver; AT-2 green (C4)"
```

---

## Task 4b: Remaining Tier-A renderers (incl. net-new Devin / OpenClaw / CodeWhale)

Add the rest of the wired-emit matrix so a full-matrix install emits everywhere §8 says it should. Not gated by a frozen AT (AT-2 uses only claude/cursor/codex), so gate it with your own unit tests asserting output-from-`credential_safety` (PD2b drift tests) and each host's config path/token.

**Files:**
- Modify: `rig/lib/renderers.js` (add renderers + complete `CREDENTIAL_SAFETY`, `RENDERERS`, `fileFor`).
- Test: extend `tests/basic-variants.unit.test.js` is wrong target — create `tests/basic-renderers.unit.test.js`.

**Per-host spec (from §8 — encode exactly, do not re-derive):**

| Host | File (project-local) | Shape | Token / mechanism | `credential_safety` |
|---|---|---|---|---|
| opencode | `opencode.json` | JSON `mcp` block; `type: local\|remote` | local `environment` map `{env:VAR}`; remote `headers` `Bearer {env:VAR}` | `manual_note_required` |
| pi | `.omp/mcp.json` | JSON `mcpServers` | `env`/`headers` naming the var; `${VAR}` | `manual_note_required` |
| gemini | `.gemini/settings.json` | JSON `mcpServers` | `env` map `${VAR}` (stdio) / `httpUrl` + headers | `manual_note_required` |
| kiro | `.kiro/settings/mcp.json` | JSON local/remote | `${VAR}` env references | `manual_note_required` |
| devin (PD5) | `.devin/config.json` | JSON (read-or-init merge) | `${env:VAR}` / `${file:/path}` | `manual_note_required` |
| openclaw (PD4) | `.openclaw/openclaw.json` | JSON `mcp.servers` | `${VAR}`; **needs `OPENCLAW_CONFIG_PATH` wiring note** | `manual_note_required` |
| codewhale (PD6) | `.codewhale/mcp.json` | JSON `servers`/`mcpServers` | `${VAR}` headers / `bearer_token_env_var`; **needs `DEEPSEEK_MCP_CONFIG` wiring note** | `manual_note_required` |
| swival | `.swival/mcp.json` | JSON `mcpServers` | no documented value-free syntax → emit server **sans secret** + note (literal-paste caveat) | `manual_note_required` |

- [ ] **Step 1: Write the failing renderer unit test** `tests/basic-renderers.unit.test.js` — one assertion per new host proving (a) the file path, (b) the credential appears by name, (c) no `valueShaped` literal. Example shape (repeat per host):

```js
#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderMcp } = require('../rig/lib/renderers');
const { withRepo, exampleServer, valueShaped } = require('./helpers/basic-install');

const cases = [
  ['opencode', 'opencode.json'],
  ['pi', '.omp/mcp.json'],
  ['gemini', '.gemini/settings.json'],
  ['kiro', '.kiro/settings/mcp.json'],
  ['devin', '.devin/config.json'],
  ['openclaw', '.openclaw/openclaw.json'],
  ['codewhale', '.codewhale/mcp.json'],
  ['swival', '.swival/mcp.json'],
];

for (const [host, file] of cases) {
  test(`${host} emits ${file}, name-only, value-free`, () => {
    withRepo((target) => {
      renderMcp(target, { hosts: [host], mcp_servers: [exampleServer] });
      const body = fs.readFileSync(path.join(target, file), 'utf8');
      assert.match(body, /EXAMPLE_DB_TOKEN/, 'references the credential by name');
      assert.doesNotMatch(body, valueShaped, 'carries no literal secret');
    });
  });
}
```

- [ ] **Step 2: Run it to confirm RED**

Run: `node --test tests/basic-renderers.unit.test.js`
Expected: FAIL — the new hosts have no renderer / no file.

- [ ] **Step 3: Implement the eight renderers** in `rig/lib/renderers.js`. JSON hosts reuse `mergeJson` (PD2d). Follow the founding-three pattern; each is standalone (PD2a). Fill `CREDENTIAL_SAFETY` for every `host:stdio`/`host:http` pair (all `manual_note_required` per the table), extend `RENDERERS`, and replace `rendererFileFor` with the real `{host: file}` map from the table. For **openclaw** and **codewhale**, the renderer only writes the repo-local file; the mandatory wiring export lives in the runbook (Task 5) — mark them so `renderMcp` records them in `noteHosts` (they already are, being `manual_note_required`).

- [ ] **Step 4: Run the renderer unit test to confirm GREEN**

Run: `node --test tests/basic-renderers.unit.test.js`
Expected: PASS (8/8).

- [ ] **Step 5: Confirm founding-three + round-trip unaffected**

Run: `node --test tests/basic-acceptance.test.js && npm run test:rig`
Expected: AT-2 + round-trip PASS (AT-1/AT-3/gitignore still RED until Task 5). Tier-1 gate PASS.

- [ ] **Step 6: Commit**

```bash
git add rig/lib/renderers.js tests/basic-renderers.unit.test.js
git commit -m "feat(rig): remaining Tier-A renderers incl. Devin/OpenClaw/CodeWhale (C4)"
```

---

## Task 4c: Tier-B note-only + Tier-C acknowledgment coverage

Tier-B hosts (Hermes, Windsurf, Cline, GitHub Copilot CLI, Antigravity) emit **no** MCP config — only a `.rig/mcp-setup.md` note (PD7). Tier-C (Generic) gets **one acknowledgment line** (PD-open-6). `renderMcp` already records `noteHosts` (Tier-B) and `tierC`. This task just adds a unit test locking the classification so a regression is caught (§11 "gaps to close" — Tier-B/C have no AT).

**Files:**
- Test: `tests/basic-renderers.unit.test.js` (extend).

- [ ] **Step 1: Add a failing classification test**

```js
test('Tier-B hosts get a note but no MCP file; Tier-C is ack-only', () => {
  withRepo((target) => {
    const r = renderMcp(target, { hosts: ['hermes', 'windsurf', 'generic'], mcp_servers: [exampleServer] });
    assert.ok(r.noteHosts.includes('hermes') && r.noteHosts.includes('windsurf'), 'Tier-B recorded for the runbook');
    assert.ok(r.tierC.includes('generic'), 'Tier-C recorded for the ack line');
    assert.equal(fs.existsSync(path.join(target, '.hermes')), false, 'no Tier-B MCP file emitted');
  });
});
```

- [ ] **Step 2: Run → confirm RED, then adjust `renderMcp`** only if the recorded shape differs. (If Task 4a/4b already populate `noteHosts`/`tierC` correctly, this test passes without code change — that is the intended outcome; keep the test as the regression guard.)

- [ ] **Step 3: Run → GREEN**

Run: `node --test tests/basic-renderers.unit.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/basic-renderers.unit.test.js rig/lib/renderers.js
git commit -m "test(rig): lock Tier-B note-only / Tier-C ack classification (C4)"
```

---

## Task 5: Credential outputs — `.env.example`, gitignore, `.rig/mcp-setup.md` runbook, README pointer

Turns **AT-1**, **AT-3**, and the **`.env` gitignored** test GREEN.

**Files:**
- Create: `rig/lib/credentials.js`
- Wire: `rig/materialize.js`.

**Interfaces:**
- Consumes: the `Receipt` from `renderMcp` (Task 4a) — `credentialNames`, `noteHosts`, `tierC`; the `config`.
- Produces (`rig/lib/credentials.js`): `writeCredentialOutputs(target, config, receipt) -> void`, which writes `.env.example`, ensures `.gitignore`, writes `.rig/mcp-setup.md`, and points `README.md`.

- [ ] **Step 1: Confirm AT-1, AT-3, gitignore are RED**

Run: `node --test --test-name-pattern='AT-1|AT-3|gitignored' tests/basic-acceptance.test.js`
Expected: FAIL.

- [ ] **Step 2: Implement `rig/lib/credentials.js`**

```js
const fs = require('node:fs');
const path = require('node:path');
const { ensureLine } = require('./payload');

const LOAD_STEP = 'set -a; source .env; set +a';
const WIRING = { openclaw: 'export OPENCLAW_CONFIG_PATH=./.openclaw/openclaw.json', codewhale: 'export DEEPSEEK_MCP_CONFIG=./.codewhale/mcp.json' };
const LABELS = {
  claude: 'Claude Code (CLI)', codex: 'Codex (CLI)', cursor: 'Cursor', opencode: 'OpenCode',
  pi: 'pi', gemini: 'Gemini CLI', kiro: 'Kiro', devin: 'Devin CLI', openclaw: 'OpenClaw',
  codewhale: 'CodeWhale', swival: 'Swival', hermes: 'Hermes Agent', windsurf: 'Windsurf',
  cline: 'Cline', 'copilot-cli': 'GitHub Copilot CLI', antigravity: 'Antigravity', generic: 'Generic agents',
};

function writeEnvExample(target, names) {
  const body = names.map((n) => `${n}=`).join('\n') + '\n';
  fs.writeFileSync(path.join(target, '.env.example'), body);
}

function gitignoreEnv(target) {
  ensureLine(target, '.gitignore', '.env');
  ensureLine(target, '.gitignore', '!.env.example');
}

// PD8: a per-host, copy-pasteable runbook. AT-3 requires Claude + Codex named
// with an actual load step (source .env / export). Manual-note hosts each get a
// labeled block; Codex carries the SC5 warning; override hosts get the wiring
// export; Tier-C gets one acknowledgment line (PD-open-6).
function writeMcpSetup(target, receipt) {
  const out = ['# MCP Server Setup', '', 'Rig emits value-free MCP config. Provide credentials via your environment; never paste a key into a committed file.', ''];
  for (const host of receipt.noteHosts) {
    out.push(`## ${LABELS[host] || host}`, '');
    if (WIRING[host]) out.push('Point the tool at the repo-local config, then load `.env`:', '', '```sh', WIRING[host], LOAD_STEP, '```', '');
    else out.push('Load `.env` into the launching shell before starting the host:', '', '```sh', LOAD_STEP, '```', '');
    if (host === 'codex') out.push('> Never paste the key into `config.toml`; use `bearer_token_env_var` / `env_vars` (name only).', '');
  }
  for (const host of (receipt.tierC || [])) {
    out.push(`## ${LABELS[host] || host}`, '', 'No MCP config surface; covered by the instruction payload. No setup step required.', '');
  }
  fs.mkdirSync(path.join(target, '.rig'), { recursive: true });
  fs.writeFileSync(path.join(target, '.rig', 'mcp-setup.md'), out.join('\n'));
}

function pointReadme(target) {
  ensureLine(target, 'README.md', 'See `.rig/mcp-setup.md` for MCP server setup.');
}

function writeCredentialOutputs(target, config, receipt) {
  writeEnvExample(target, receipt.credentialNames);
  gitignoreEnv(target);
  writeMcpSetup(target, receipt);
  pointReadme(target);
}

module.exports = { writeCredentialOutputs, writeEnvExample, gitignoreEnv, writeMcpSetup, pointReadme };
```

- [ ] **Step 3: Wire into `rig/materialize.js`** — after the `renderMcp` line:

```js
    require('./lib/credentials').writeCredentialOutputs(args.target, config, receipt);
```

- [ ] **Step 4: Run the acceptance tests to confirm AT-1/AT-3/gitignore GREEN**

Run: `node --test tests/basic-acceptance.test.js`
Expected: AT-1, AT-2, AT-3, round-trip, and `.env` gitignored all PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add rig/lib/credentials.js rig/materialize.js
git commit -m "feat(rig): credential outputs + PD8 mcp-setup runbook; AT-1/AT-3 green (C5)"
```

---

## Task 6: Secret guard (floor + tracked-`.env` + chained shim + scanner supplement)

Turns **AT-4** and **AT-4b** GREEN. Runtime-free git pre-commit guard (SC6).

**Files:**
- Create: `rig/lib/guard.js`
- Wire: `rig/materialize.js`.
- Test: `tests/basic-guard.unit.test.js` (unit-level floor regex), plus the frozen AT-4/AT-4b.

**Interfaces:**
- Produces (`rig/lib/guard.js`):
  - `GUARD_SCRIPT: string` — the full `secret-guard.sh` body.
  - `installGuard(target) -> { chainedBackup: boolean }` — writes `.rig/hooks/secret-guard.sh` (mode 755); if `.git/hooks` exists, installs the `pre-commit` shim, backing up any pre-existing non-Rig hook to `.git/hooks/pre-commit.rig-chained`. Skips the shim (script only) when `.git` is absent.
  - `FLOOR_PATTERN: string` — the ERE, exported for the unit test.

- [ ] **Step 1: Confirm AT-4/AT-4b are RED**

Run: `node --test tests/basic-secret-guard.test.js`
Expected: FAIL — no guard installed.

- [ ] **Step 2: Implement `rig/lib/guard.js`**. The floor patterns are written so the char after each prefix is a regex metaclass (`[`) — the script is therefore value-free by construction and never self-trips (Global Constraints).

```js
const fs = require('node:fs');
const path = require('node:path');

// High-precision floor (SC6c): curated unambiguous secret formats. NOT entropy.
const FLOOR_PATTERN =
  'sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|' +
  'AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----';

const GUARD_SCRIPT = `#!/bin/sh
# Rig Tier 2 Basic secret guard (SC6). Committed + reviewable. Do not edit by hand.
# Floor + tracked-.env always run; a scanner (gitleaks/trufflehog) supplements.
set -u
FLOOR='${FLOOR_PATTERN}'
block() { echo "rig secret guard: $1" >&2; exit 1; }

# 1. Tracked .env is never allowed, even force-added (SC6b).
if git diff --cached --name-only -z | tr '\\0' '\\n' | grep -Eq '(^|/)\\.env$'; then
  block "a .env file is staged; keep secrets out of git"
fi

# 2. Precision floor over staged additions (always runs).
if git diff --cached -U0 --no-color | grep -E '^\\+' | grep -Ev '^\\+\\+\\+' | grep -Eq "$FLOOR"; then
  block "a value-shaped secret is staged"
fi

# 3. Scanner tier supplements the floor (SC6e): finding = block; exec error = warn.
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks protect --staged --no-banner >/dev/null 2>&1; gc=$?
  if [ "$gc" -eq 1 ]; then block "gitleaks flagged staged content"; 
  elif [ "$gc" -gt 1 ]; then echo "rig: gitleaks errored ($gc); relying on floor" >&2; fi
elif command -v trufflehog >/dev/null 2>&1; then
  if trufflehog git file://. --since-commit HEAD --only-verified --fail >/dev/null 2>&1; then :; 
  else th=$?; [ "$th" -eq 183 ] && block "trufflehog flagged staged content"; fi
fi

exit 0
`;

const SHIM = `#!/bin/sh
# Rig secret guard shim (SC6d). Managed by Rig; runs the guard then any chained hook.
DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
"$DIR/.rig/hooks/secret-guard.sh" "$@" || exit $?
if [ -x "$DIR/.git/hooks/pre-commit.rig-chained" ]; then
  "$DIR/.git/hooks/pre-commit.rig-chained" "$@" || exit $?
fi
exit 0
`;

function installGuard(target) {
  const guardPath = path.join(target, '.rig', 'hooks', 'secret-guard.sh');
  fs.mkdirSync(path.dirname(guardPath), { recursive: true });
  fs.writeFileSync(guardPath, GUARD_SCRIPT, { mode: 0o755 });

  const hooksDir = path.join(target, '.git', 'hooks');
  if (!fs.existsSync(path.join(target, '.git'))) return { chainedBackup: false };
  fs.mkdirSync(hooksDir, { recursive: true });

  const hook = path.join(hooksDir, 'pre-commit');
  let chainedBackup = false;
  if (fs.existsSync(hook)) {
    const body = fs.readFileSync(hook, 'utf8');
    if (!body.includes('Rig secret guard shim')) { // don't chain our own shim
      fs.renameSync(hook, path.join(hooksDir, 'pre-commit.rig-chained'));
      chainedBackup = true;
    }
  }
  fs.writeFileSync(hook, SHIM, { mode: 0o755 });
  return { chainedBackup };
}

module.exports = { GUARD_SCRIPT, SHIM, FLOOR_PATTERN, installGuard };
```

- [ ] **Step 3: Write a floor-regex unit test** `tests/basic-guard.unit.test.js`:

```js
#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const { FLOOR_PATTERN, GUARD_SCRIPT } = require('../rig/lib/guard');
const { valueShaped } = require('./helpers/basic-install');

const floor = new RegExp(FLOOR_PATTERN);

test('floor matches unambiguous secret formats', () => {
  assert.match(['sk-', 'ant-api03-AAAAAAAAAAAAAAAAAAAA'].join(''), floor);
  assert.match(['AKIA', '0123456789ABCDEF'].join(''), floor);
});

test('floor ignores reference forms (precision over recall, SC6c)', () => {
  assert.doesNotMatch('${EXAMPLE_DB_TOKEN}', floor);
  assert.doesNotMatch('bearer_token_env_var = "EXAMPLE_DB_TOKEN"', floor);
  assert.doesNotMatch('${env:EXAMPLE_DB_TOKEN}', floor);
});

test('the guard script itself is value-free (never self-trips)', () => {
  assert.doesNotMatch(GUARD_SCRIPT, valueShaped);
});
```

- [ ] **Step 4: Run the unit test to confirm GREEN**

Run: `node --test tests/basic-guard.unit.test.js`
Expected: PASS (3/3).

- [ ] **Step 5: Wire into `rig/materialize.js`** — after credential outputs:

```js
    const guard = require('./lib/guard').installGuard(args.target);
    receipt.chainedBackup = guard.chainedBackup;
```

- [ ] **Step 6: Run the frozen guard tests to confirm GREEN**

Run: `node --test tests/basic-secret-guard.test.js`
Expected: PASS (2/2) — fake `sk-…` and force-added `.env` blocked; `${VAR}` commits cleanly.

- [ ] **Step 7: Commit**

```bash
git add rig/lib/guard.js rig/materialize.js tests/basic-guard.unit.test.js
git commit -m "feat(rig): runtime-free secret guard (floor+scanner+chained shim); AT-4 green (C6)"
```

---

## Task 7: Uninstall — receipt-driven, repo-local, chained-hook restore

Turns **AT-5** and **AT-5b** GREEN. Basic's OWN uninstall — not `scripts/uninstall.js`.

**Files:**
- Create: `rig/lib/receipt.js`
- Create: `rig/lib/uninstall.js`
- Wire: `rig/materialize.js` (write the receipt on install).

**Interfaces:**
- Produces (`rig/lib/receipt.js`): `RECEIPT_PATH = '.rig/basic-receipt.json'`; `writeReceipt(target, receipt) -> void`; `readReceipt(target) -> receipt | null`.
- Produces (`rig/lib/uninstall.js`): `uninstall(target) -> void`.
- Receipt shape (written on install): `{ ownedFiles: string[], mergedEntries: [{file, serverName}], credentialNames, chainedBackup: boolean }`.

- [ ] **Step 1: Confirm AT-5/AT-5b are RED**

Run: `node --test tests/basic-uninstall.test.js`
Expected: FAIL — `--uninstall` throws / removes nothing.

- [ ] **Step 2: Implement `rig/lib/receipt.js`**

```js
const fs = require('node:fs');
const path = require('node:path');
const RECEIPT_PATH = '.rig/basic-receipt.json';

function writeReceipt(target, receipt) {
  const p = path.join(target, RECEIPT_PATH);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(receipt, null, 2) + '\n');
}
function readReceipt(target) {
  const p = path.join(target, RECEIPT_PATH);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}
module.exports = { RECEIPT_PATH, writeReceipt, readReceipt };
```

- [ ] **Step 3: Implement `rig/lib/uninstall.js`**

```js
const fs = require('node:fs');
const path = require('node:path');
const { readReceipt, RECEIPT_PATH } = require('./receipt');

const rm = (target, rel) => { const p = path.join(target, rel); if (fs.existsSync(p)) fs.rmSync(p, { force: true }); };

function uninstall(target) {
  const receipt = readReceipt(target) || { ownedFiles: [], mergedEntries: [], chainedBackup: false };

  // 1. Delete Rig-owned files (created by Rig, safe to remove wholesale).
  for (const f of receipt.ownedFiles) rm(target, f);

  // 2. Un-merge Rig's server entries from files the user also owns (non-destructive).
  for (const { file, serverName } of receipt.mergedEntries || []) {
    const p = path.join(target, file);
    if (!fs.existsSync(p) || !file.endsWith('.json')) continue;
    try {
      const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
      const bag = obj.mcpServers || (obj.mcp && obj.mcp.servers) || obj.servers;
      if (bag && bag[serverName]) delete bag[serverName];
      fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
    } catch { /* leave a malformed user file alone */ }
  }

  // 3. Credential scaffolding + setup note (never the user's .env).
  rm(target, '.env.example');
  rm(target, '.rig/mcp-setup.md');

  // 4. Secret guard: remove the committed script; restore or remove the shim.
  rm(target, '.rig/hooks/secret-guard.sh');
  const hook = path.join(target, '.git', 'hooks', 'pre-commit');
  const chained = path.join(target, '.git', 'hooks', 'pre-commit.rig-chained');
  if (fs.existsSync(chained)) fs.renameSync(chained, hook); // restores original byte-for-byte (AT-5b)
  else rm(target, '.git/hooks/pre-commit');

  // 5. Remove the receipt, then prune now-empty Rig dirs.
  rm(target, RECEIPT_PATH);
  for (const dir of ['.rig/hooks']) {
    const p = path.join(target, dir);
    if (fs.existsSync(p) && fs.readdirSync(p).length === 0) fs.rmdirSync(p);
  }
}
module.exports = { uninstall };
```

- [ ] **Step 4: Wire the receipt write into `rig/materialize.js`** — as the last line of the `mcp_servers.length > 0` block:

```js
    require('./lib/receipt').writeReceipt(args.target, receipt);
```

- [ ] **Step 5: Run the frozen uninstall tests to confirm GREEN**

Run: `node --test tests/basic-uninstall.test.js`
Expected: PASS (2/2) — Rig artifacts removed, `.env` preserved byte-for-byte, chained hook restored.

- [ ] **Step 6: Run the FULL Basic suite + Tier-1 gate**

Run: `node --test tests/basic-acceptance.test.js tests/basic-secret-guard.test.js tests/basic-uninstall.test.js && npm run test:rig`
Expected: all GREEN (9/9 acceptance + Tier-1).

- [ ] **Step 7: Commit**

```bash
git add rig/lib/receipt.js rig/lib/uninstall.js rig/materialize.js
git commit -m "feat(rig): receipt-driven repo-local uninstall; AT-5 green (C7)"
```

---

## Task 8: Doc/code reconciliation (Gate-1, BSC6/BSC7) — independent track

No code. Reconcile `docs/agent-portability.md` to the shipped adapter code and add the missing Hermes README sections. Independent of all Tasks 1–7; can run in parallel.

**Files:**
- Modify: `docs/agent-portability.md`
- Modify: `README.es.md`, `README.ko.md`

- [ ] **Step 1: Add the OpenClaw + Devin rows** to the "Supported Adapters" table in `docs/agent-portability.md` (after `Kiro`, before `Generic agents`), matching the existing column style:

```markdown
| OpenClaw | `.openclaw/skills/`, README.es/ko install sections | ClawHub skill package built by `scripts/build-openclaw-skills.js`; `clawhub install ponytail`. |
| Devin | `.devin-plugin/plugin.json`, README.es/ko install sections | `devin plugins install DietrichGebert/ponytail`; skills exposed as `/ponytail:<skill>`. |
```

- [ ] **Step 2: Relabel the "Instruction-tier" note** on the `Antigravity`, `CodeWhale`, and `Swival` rows — all three ship MCP config; only `Generic agents` truly has none (§8 correction). Replace the trailing "Instruction-tier." sentence on those three rows with a note that they also expose an MCP config surface (see `project-dev-docs/tier-2-design-docs/basic/basic-design.md` §8).

- [ ] **Step 3: Add the missing Hermes install section** to `README.es.md` and `README.ko.md`, mirroring the existing `### Devin CLI` / `### OpenClaw` block format. Hermes' adapter is `plugin.yaml`; place the section near the other native-plugin hosts. Spanish example:

```markdown
### Hermes Agent

Instala ponytail como plugin nativo de Hermes (`plugin.yaml`): inyecta el modo activo vía `pre_llm_call`, registra el cambio de modo `/ponytail` y expone los skills como `ponytail:<skill>`.
```

Add the Korean equivalent to `README.ko.md` in the matching location.

- [ ] **Step 4: Confirm the adapter tests that read these files still pass**

Run: `node --test tests/hermes-plugin.test.js tests/openclaw-skills.test.js`
Expected: PASS — the doc edits don't touch adapter behavior.

- [ ] **Step 5: Commit**

```bash
git add docs/agent-portability.md README.es.md README.ko.md
git commit -m "docs: reconcile agent-portability + Hermes README sections (C8, BSC6/BSC7)"
```

---

## Task 9: First-wire verification caveats (C9)

Two renderers ship on a "confirm on first wire" note, not a closed #7 gate (§11): OpenClaw `${VAR}`-in-`mcp.servers` scope, and CodeWhale `mcp_config_path`-overlay upgrade. This is external verification, not code.

- [ ] **Step 1:** In the OpenClaw and CodeWhale blocks of `.rig/mcp-setup.md` (generated by Task 5's `writeMcpSetup`), add a one-line "confirm on first wire" caveat for each (OpenClaw `${VAR}` scope in `mcp.servers`; CodeWhale `mcp_config_path` overlay). Extend `writeMcpSetup` in `rig/lib/credentials.js` with a per-host `CAVEAT` map; add a unit assertion in `tests/basic-renderers.unit.test.js` that the note contains the caveat for those two hosts.
- [ ] **Step 2:** Run `node --test tests/basic-renderers.unit.test.js` → GREEN.
- [ ] **Step 3:** Record the two unverified assumptions as an open note in `project-dev-docs/tier-2-design-docs/basic/` (not a blocker; carried as a caveat per §11).
- [ ] **Step 4: Commit**

```bash
git add rig/lib/credentials.js tests/basic-renderers.unit.test.js
git commit -m "feat(rig): first-wire caveats for OpenClaw/CodeWhale in mcp-setup (C9)"
```

---

## Final verification

- [ ] **Run the complete test suite:**

Run: `npm test`
Expected: fully GREEN — the nine Basic acceptance tests, the new unit tests, and every pre-existing test (`rig-bootstrap`, `hooks`, `hermes-plugin`, `openclaw-skills`, `pi-extension`, …) pass.

- [ ] **Confirm the installed-repo invariants hold** (spot-check a fresh temp install): no Rig process/LLM in the target, no secret value in any emitted file, `.env` gitignored and never created, all removals repo-local.

---

## Self-Review (author's checklist — completed at plan-writing time)

**1. Spec coverage** — every §11 component and acceptance gate maps to a task:

| Spec item | Task |
|---|---|
| C1 Manifest + validator (PD-open-1, PD9, PD1a–d, BSC5) | Task 1 |
| C2 Materializer core / payload pass (PD2f, §5, PD1d) | Task 2 |
| C3 MCP emit generator / variant set-cover (PD2a–f, PD3, PD3a) | Task 3 |
| C4 Renderers — founding 3, full matrix, Tier-B/C (§8, PD4–7, SUP, PD-open-5/6) | Tasks 4a/4b/4c |
| C5 Credential outputs + PD8 runbook (SC4, SC5, PD2c, PD8) | Task 5 |
| C6 Secret guard (SC6/6a/6c/6d/6e) | Task 6 |
| C7 Uninstall (§10, PD-open-4, SC6d) | Task 7 |
| C8 Doc/code reconciliation (BSC6, BSC7) | Task 8 |
| C9 First-wire verifications (PD4, PD6, PD8) | Task 9 |
| AT-1/AT-2/AT-3/round-trip/gitignore | Tasks 5, 4a, 5, 1+2, 5 |
| AT-4/AT-4b | Task 6 |
| AT-5/AT-5b | Task 7 |

**2. Placeholder scan** — no `TBD`/`add error handling`/"similar to Task N" placeholders; every code step carries real content. The only intentional deferrals are the Task 4b renderer bodies (specified by an exact per-host table drawn from §8) and Task 9's external confirmation (non-code by nature).

**3. Type consistency** — `renderMcp` returns the `Receipt` consumed by `writeCredentialOutputs` (Task 5) and `writeReceipt`/`uninstall` (Task 7); `credentialNames`/`noteHosts`/`tierC`/`ownedFiles`/`mergedEntries`/`chainedBackup` are named identically across producer and consumers. `ensureLine` (Task 2) is reused by `credentials.js` (Task 5). `validate`/`loadUserConfig` (Task 1) are consumed by `materialize.js` (Task 2). The frozen seam (`--target/--manifest/--uninstall`) matches `tests/helpers/basic-install.js` exactly.

**Sequence & parallelism (from §11):** Task 1 → Task 2 (foundation; round-trip green, Tier-1 green). Then three parallel tracks — MCP [4a → 4b/4c → 5], guard [6], docs [8]. Task 7 (uninstall) after 5 + 6. Task 9 rides alongside 4b.
