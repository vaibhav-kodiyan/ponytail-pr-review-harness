#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const pointer = 'Before acting, read `.rig/routing.md` and route this task through its skill table.';

const sharedSkills = [
  'grilling',
  'product-design',
  'ponytail',
  'execution',
  'tdd',
  'debugging',
  'code-review',
];

function read(target, relativePath) {
  return fs.readFileSync(path.join(target, relativePath), 'utf8');
}

test('committed Claude and Codex skills match their canonical Tier 1 sources', () => {
  for (const skill of sharedSkills) {
    const source = skill === 'ponytail'
      ? read(root, 'skills/ponytail/SKILL.md')
      : read(root, `rig/tier-1/skills/${skill}/SKILL.md`);
    assert.equal(read(root, `.claude/skills/rig-${skill}/SKILL.md`), source, `Claude ${skill}`);
    assert.equal(read(root, `.agents/skills/rig-${skill}/SKILL.md`), source, `Codex ${skill}`);
  }
});

test('Tier 1 bootstrap configures every instruction host in a fresh repository', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-tier-1-'));

  try {
    fs.mkdirSync(path.join(target, '.cursor', 'rules'), { recursive: true });
    fs.mkdirSync(path.join(target, '.github'), { recursive: true });
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), '# Existing Claude guidance\n');
    fs.writeFileSync(path.join(target, 'AGENTS.md'), '# Existing agent guidance\n');
    fs.writeFileSync(path.join(target, 'GEMINI.md'), '# Existing Gemini guidance\n');
    fs.writeFileSync(path.join(target, '.github', 'copilot-instructions.md'), '# Existing Copilot guidance\n');
    fs.writeFileSync(path.join(target, '.cursor', 'rules', 'existing.mdc'), 'existing\n');

    execFileSync('sh', [path.join(root, 'rig', 'bootstrap.sh'), '--tier', '1', '--target', target]);

    assert.match(read(target, '.rig/routing.md'), /# Rig Router/);
    assert.match(read(target, '.rig/rules/ponytail.md'), /always active/i);
    for (const skill of sharedSkills) {
      const shared = read(target, `.rig/skills/${skill}/SKILL.md`);
      const claude = read(target, `.claude/skills/rig-${skill}/SKILL.md`);
      const codex = read(target, `.agents/skills/rig-${skill}/SKILL.md`);
      assert.equal(claude, shared, `Claude ${skill}`);
      assert.equal(codex, shared, `Codex ${skill}`);
    }

    assert.match(read(target, 'CLAUDE.md'), /^# Existing Claude guidance$/m);
    const entrypoints = [
      'CLAUDE.md',
      'AGENTS.md',
      'GEMINI.md',
      '.github/copilot-instructions.md',
    ];
    for (const entrypoint of entrypoints) {
      assert.equal(
        read(target, entrypoint).split(pointer).length - 1,
        1,
        `${entrypoint} should contain the pointer exactly once`,
      );
    }

    // Re-install must not duplicate pointer lines (ensure_line idempotency).
    execFileSync('sh', [path.join(root, 'rig', 'bootstrap.sh'), '--tier', '1', '--target', target]);
    for (const entrypoint of entrypoints) {
      assert.equal(
        read(target, entrypoint).split(pointer).length - 1,
        1,
        `${entrypoint} should still contain the pointer exactly once after re-install`,
      );
    }

    assert.match(read(target, 'AGENTS.md'), /^# Existing agent guidance$/m);
    assert.match(read(target, 'GEMINI.md'), /^# Existing Gemini guidance$/m);
    assert.match(read(target, '.github/copilot-instructions.md'), /^# Existing Copilot guidance$/m);
    assert.equal(read(target, '.cursor/rules/existing.mdc'), 'existing\n');
    assert.match(read(target, '.cursor/rules/rig.mdc'), /alwaysApply: true/);
    assert.match(read(target, '.cursor/rules/rig.mdc'), /\.rig\/routing\.md/);
    for (const adapter of [
      '.windsurf/rules/rig.md',
      '.clinerules/rig.md',
      '.agents/rules/rig.md',
      '.kiro/steering/rig.md',
    ]) {
      assert.match(read(target, adapter), /\.rig\/routing\.md/);
    }
    assert.match(read(target, '.kiro/steering/rig.md'), /inclusion: always/);

    const installed = [];
    for (const top of ['.rig', '.claude', '.cursor', '.windsurf', '.clinerules', '.agents', '.kiro', '.github']) {
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const file = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(file);
          else installed.push(file);
        }
      };
      walk(path.join(target, top));
    }

    const rigFiles = installed.filter((file) => file.includes(`${path.sep}.rig${path.sep}`));
    assert.ok(rigFiles.every((file) => file.endsWith('.md')));
    const body = installed.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    assert.doesNotMatch(body, /(?:API_KEY|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|(?<![a-z0-9])sk-[a-z0-9-]{10,})/i);
    assert.equal(fs.existsSync(path.join(target, '.env')), false);
    assert.equal(fs.existsSync(path.join(target, '.env.example')), false);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});
