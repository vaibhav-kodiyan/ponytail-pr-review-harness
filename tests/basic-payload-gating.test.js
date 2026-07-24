#!/usr/bin/env node
// Build-owned coverage for TP-C2.* in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { materialize, walk, withRepo } = require('./helpers/basic-install');

const exists = (target, rel) => fs.existsSync(path.join(target, rel));

function tree(target) {
  const entries = {};
  for (const file of walk(target)) {
    const rel = path.relative(target, file);
    if (rel === '.rig-manifest.test.json') continue;
    entries[rel] = fs.readFileSync(file, 'utf8');
  }
  return entries;
}

test('TP-C2.1 selected hosts prune unselected payload adapters', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['claude'], mcp_servers: [] });

    assert.ok(exists(target, '.rig/routing.md'), 'shared router is installed');
    assert.ok(exists(target, '.rig/rules/rig.md'), 'shared rig rule is installed');
    assert.ok(exists(target, '.claude/skills/rig-implementation/SKILL.md'), 'Claude payload is installed');

    for (const rel of [
      '.agents/skills/rig-implementation/SKILL.md',
      '.agents/rules/rig.md',
      '.cursor/rules/rig.mdc',
      '.kiro/steering/rig.md',
      '.windsurf/rules/rig.md',
      '.clinerules/rig.md',
      '.github/copilot-instructions.md',
    ]) {
      assert.equal(exists(target, rel), false, `${rel} is pruned`);
    }
  });
});

test('TP-C2.2 native-skill-only hosts do not install .rig/skills fallback copies', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['claude', 'codex'], mcp_servers: [] });

    assert.ok(exists(target, '.claude/skills/rig-grilling/SKILL.md'), 'Claude native skills installed');
    assert.ok(exists(target, '.agents/skills/rig-grilling/SKILL.md'), 'Codex native skills installed');
    assert.ok(exists(target, '.rig/routing.md'), 'shared router installed');
    assert.ok(exists(target, '.rig/rules/rig.md'), 'shared rig rule installed');
    assert.equal(exists(target, '.rig/skills/grilling/SKILL.md'), false, '.rig/skills omitted');
  });
});

test('TP-C2.3 selecting an instruction-only host installs .rig/skills fallback copies', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['claude', 'cursor'], mcp_servers: [] });

    for (const rel of [
      '.rig/skills/grilling/SKILL.md',
      '.rig/skills/product-design/SKILL.md',
      '.rig/skills/implementation/SKILL.md',
      '.rig/skills/execution/SKILL.md',
      '.rig/skills/tdd/SKILL.md',
      '.rig/skills/debugging/SKILL.md',
      '.rig/skills/code-review/SKILL.md',
    ]) {
      assert.ok(exists(target, rel), `${rel} installed for instruction hosts`);
    }
  });
});

test('TP-C2.4 materialization is deterministic for identical manifests', () => {
  withRepo((left) => {
    withRepo((right) => {
      const manifest = { hosts: ['claude', 'cursor', 'codex'], mcp_servers: [] };
      materialize(left, manifest);
      materialize(right, manifest);
      assert.deepEqual(tree(left), tree(right), 'two installs produce byte-identical trees');
    });
  });
});

test('antigravity co-reads the Codex .agents tree plus GEMINI.md, workflows, and .rig/skills', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['antigravity'], mcp_servers: [] });

    assert.ok(exists(target, '.agents/skills/rig-implementation/SKILL.md'), '.agents skills installed');
    assert.ok(exists(target, '.agents/rules/rig.md'), '.agents rules installed');
    assert.ok(exists(target, 'AGENTS.md'), 'AGENTS.md pointer installed');
    assert.ok(exists(target, 'GEMINI.md'), 'GEMINI.md pointer installed for Antigravity overrides');
    assert.ok(exists(target, '.agents/workflows/rig.md'), 'Antigravity workflows installed');
    assert.ok(exists(target, '.agents/workflows/rig-help.md'), 'Antigravity help workflow installed');
    assert.ok(exists(target, '.rig/skills/grilling/SKILL.md'), 'instruction-only host gets .rig/skills');
    assert.equal(exists(target, '.claude/skills/rig-implementation/SKILL.md'), false, 'Claude tree pruned');
  });
});

test('codewhale gets AGENTS.md only — not the .agents skills/rules tree', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['codewhale'], mcp_servers: [] });

    assert.ok(exists(target, 'AGENTS.md'), 'AGENTS.md pointer installed');
    assert.ok(exists(target, '.rig/routing.md'), 'shared router installed');
    assert.equal(exists(target, '.agents/skills/rig-implementation/SKILL.md'), false, '.agents skills pruned');
    assert.equal(exists(target, '.agents/rules/rig.md'), false, '.agents rules pruned');
    assert.equal(exists(target, 'GEMINI.md'), false, 'GEMINI.md pruned');
    assert.equal(exists(target, '.agents/workflows/rig.md'), false, 'workflows pruned');
  });
});
