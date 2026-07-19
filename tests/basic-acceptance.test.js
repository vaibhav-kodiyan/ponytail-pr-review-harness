#!/usr/bin/env node
// Gate-1 acceptance tests for Tier 2 Basic — SC7 / §9 of
// project-dev-docs/tier-2-design-docs/basic/basic-design.md.
// Authored in the grilling phase; the implementer MUST NOT edit these (gate
// contract, routing.md). RED until the materializer is built, then GREEN.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { root, materialize, exampleServer, valueShaped, walk, withRepo } = require('./helpers/basic-install');

const read = (target, rel) => fs.readFileSync(path.join(target, rel), 'utf8');
const emitted = (target) => walk(target).filter((f) => !f.endsWith('.rig-manifest.test.json'));

test('AT-1 writer clean: .env.example blank, no .env, no secret in outputs', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['claude', 'cursor', 'codex'], mcp_servers: [exampleServer] });

    const example = read(target, '.env.example');
    assert.match(example, /^EXAMPLE_DB_TOKEN=\s*$/m, '.env.example names the slot with a blank value');
    assert.doesNotMatch(example, valueShaped, '.env.example carries no real value');

    assert.equal(fs.existsSync(path.join(target, '.env')), false, 'Rig never creates the real .env');

    for (const f of emitted(target)) {
      assert.doesNotMatch(fs.readFileSync(f, 'utf8'), valueShaped, `${path.relative(target, f)} is value-free`);
    }
  });
});

test('AT-2 per-host emit is native and name-only', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['claude', 'cursor', 'codex'], mcp_servers: [exampleServer] });

    // Each selected host gets a config in its own format, referencing the
    // credential by NAME, never a literal value (SC5). Which transport (and so
    // the exact loader) each host lands on is PD3a's choice, so assert the
    // invariant that holds for every variant, not one specific mechanism.
    for (const file of ['.mcp.json', '.cursor/mcp.json', '.codex/config.toml']) {
      assert.ok(fs.existsSync(path.join(target, file)), `${file} emitted`);
      const body = read(target, file);
      assert.match(body, /EXAMPLE_DB_TOKEN/, `${file} references the credential by name`);
      assert.match(body, /\$\{|_env_var|env_vars/, `${file} uses a reference form, not a value`);
      assert.doesNotMatch(body, valueShaped, `${file} carries no literal secret`);
    }
  });
});

test('AT-3 manual-note hosts get a named load step in .rig/mcp-setup.md', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['claude', 'cursor', 'codex'], mcp_servers: [exampleServer] });

    const note = read(target, '.rig/mcp-setup.md');
    // Claude-CLI and Codex are manual_note_required on every transport (§8), so
    // both must appear with a load step. Cursor may be config_only_safe on
    // stdio, so it is intentionally not asserted here.
    assert.match(note, /Claude/i, 'note names Claude');
    assert.match(note, /Codex/i, 'note names Codex');
    assert.match(note, /source\b.*\.env|export\s+\w+=/, 'note documents an actual load step');
  });
});

test('no secret in git: .env is gitignored by the install', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });
    assert.match(read(target, '.gitignore'), /^\.env$/m, '.env is gitignored');
  });
});

test('round-trip: materializer reproduces the Tier-1 payload byte-for-byte', () => {
  const payloadTops = ['.rig', '.claude', '.agents', '.cursor', '.windsurf', '.clinerules', '.kiro', '.github'];
  const entrypoints = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md'];
  const seed = (dir) => {
    for (const [rel, body] of [
      ['CLAUDE.md', '# Claude\n'],
      ['AGENTS.md', '# Agents\n'],
      ['GEMINI.md', '# Gemini\n'],
      ['.github/copilot-instructions.md', '# Copilot\n'],
    ]) {
      fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), body);
    }
  };
  const tree = (dir) => {
    const map = new Map();
    for (const top of payloadTops) {
      for (const f of walk(path.join(dir, top))) map.set(path.relative(dir, f), fs.readFileSync(f, 'utf8'));
    }
    for (const e of entrypoints) {
      const p = path.join(dir, e);
      if (fs.existsSync(p)) map.set(e, fs.readFileSync(p, 'utf8'));
    }
    return map;
  };

  const viaBootstrap = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-boot-'));
  const viaManifest = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-mani-'));
  try {
    seed(viaBootstrap);
    seed(viaManifest);
    execFileSync('sh', [path.join(root, 'rig', 'bootstrap.sh'), '--tier', '1', '--target', viaBootstrap]);
    materialize(viaManifest, { mcp_servers: [] }); // hosts omitted ⇒ all supported (PD1d)

    const expected = tree(viaBootstrap);
    const actual = tree(viaManifest);
    for (const [rel, bytes] of expected) {
      assert.ok(actual.has(rel), `materializer is missing payload file ${rel}`);
      assert.equal(actual.get(rel), bytes, `payload mismatch at ${rel}`);
    }
  } finally {
    fs.rmSync(viaBootstrap, { recursive: true, force: true });
    fs.rmSync(viaManifest, { recursive: true, force: true });
  }
});
