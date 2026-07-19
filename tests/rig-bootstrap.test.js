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
  ['grilling', 'rig/tier-1/skills/grilling/SKILL.md'],
  ['product-design', 'rig/tier-1/skills/product-design/SKILL.md'],
  ['implementation', 'skills/rig/SKILL.md'],
  ['execution', 'rig/tier-1/skills/execution/SKILL.md'],
  ['tdd', 'rig/tier-1/skills/tdd/SKILL.md'],
  ['debugging', 'rig/tier-1/skills/debugging/SKILL.md'],
  ['code-review', 'rig/tier-1/skills/code-review/SKILL.md'],
];

function read(target, relativePath) {
  return fs.readFileSync(path.join(target, relativePath), 'utf8');
}

function backtickedRigPaths(text) {
  return [...text.matchAll(/`(\.rig\/[^`]+)`/g)]
    .map((match) => match[1])
    .filter((relativePath) => !/[<>{}*]/.test(relativePath));
}

function nativeSkillNames(host) {
  return sharedSkills.map(([skill]) => {
    const skillFile = `${host}/skills/rig-${skill}/SKILL.md`;
    const match = read(root, skillFile).match(/^name:\s*(\S+)\s*$/m);
    assert.ok(match, `${skillFile} should declare a name`);
    return match[1];
  }).sort();
}

test('committed Claude and Codex skills match their canonical Tier 1 sources', () => {
  for (const [skill, sourcePath] of sharedSkills) {
    const source = read(root, sourcePath);
    assert.equal(read(root, `.claude/skills/rig-${skill}/SKILL.md`), source, `Claude ${skill}`);
    assert.equal(read(root, `.agents/skills/rig-${skill}/SKILL.md`), source, `Codex ${skill}`);
  }
});

test('native skill names match the router index', () => {
  const routerNames = [...read(root, 'rig/tier-1/routing.md').matchAll(/^\| `([^`]+)` \|/gm)]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(nativeSkillNames('.claude'), routerNames, 'Claude skill names');
  assert.deepEqual(nativeSkillNames('.agents'), routerNames, 'Codex skill names');
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
    assert.match(read(target, '.rig/rules/rig.md'), /always active/i);
    for (const [skill] of sharedSkills) {
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
    assert.match(read(target, '.windsurf/rules/rig.md'), /trigger: always_on/);
    assert.doesNotMatch(read(target, '.clinerules/rig.md'), /^---\n/);
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
    for (const relativePath of backtickedRigPaths(body)) {
      assert.equal(fs.existsSync(path.join(target, relativePath)), true, `${relativePath} should exist after install`);
    }
    assert.doesNotMatch(body, /(?:API_KEY|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|(?<![a-z0-9])sk-[a-z0-9-]{10,})/i);
    assert.equal(fs.existsSync(path.join(target, '.env')), false);
    assert.equal(fs.existsSync(path.join(target, '.env.example')), false);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});
