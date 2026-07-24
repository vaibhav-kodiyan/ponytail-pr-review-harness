#!/usr/bin/env node
// Repo-level guard: fake secret fixtures must be split at source so GitHub Push
// Protection is not the first place we learn about a literal secret-shaped value.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { FLOOR_PATTERN } = require('../rig/lib/guard');

const repoRoot = path.join(__dirname, '..');
const floor = new RegExp(FLOOR_PATTERN);
const secret = (...parts) => parts.join('');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, stdio: 'pipe' });
}

function publishableFiles(root) {
  return git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
}

function secretShapedLines(root, files = publishableFiles(root)) {
  const hits = [];
  for (const rel of files) {
    const body = fs.readFileSync(path.join(root, rel));
    if (body.includes(0)) continue;
    body.toString('utf8').split(/\r?\n/).forEach((line, index) => {
      if (floor.test(line)) hits.push(`${rel}:${index + 1}`);
    });
  }
  return hits;
}

function withTempRepo(fn) {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-secret-fixtures-'));
  try {
    git(target, ['init', '-q']);
    git(target, ['config', 'user.email', 'test@example.com']);
    git(target, ['config', 'user.name', 'Rig Test']);
    fn(target);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

test('literal Slack/GitHub/AWS/private-key-shaped fixtures fail the publishable-file scan', () => {
  withTempRepo((target) => {
    const literals = {
      'slack.txt': secret('xox', 'b-123456789012-123456789012-abcdefghijklmnopqrstuvwx'),
      'github.txt': secret('ghp', '_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
      'aws.txt': secret('AKIA', '0123456789ABCDEF'),
      'private-key.txt': secret('-----BEGIN ', 'PRIVATE KEY-----'),
    };
    for (const [rel, value] of Object.entries(literals)) {
      fs.writeFileSync(path.join(target, rel), `fixture=${value}\n`);
    }
    git(target, ['add', '.']);
    git(target, ['commit', '-m', 'add literal fixtures']);

    assert.deepEqual(secretShapedLines(target).map((hit) => hit.split(':')[0]).sort(), Object.keys(literals).sort());
  });
});

test('split-string runtime fixture construction passes the tracked-file scan', () => {
  withTempRepo((target) => {
    fs.writeFileSync(path.join(target, 'fixture.test.js'), [
      "const secret = (...parts) => parts.join('');",
      "const slack = secret('xox', 'b-123456789012-123456789012-abcdefghijklmnopqrstuvwx');",
      "const github = secret('ghp', '_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');",
      "const aws = secret('AKIA', '0123456789ABCDEF');",
      "const pem = secret('-----BEGIN ', 'PRIVATE KEY-----');",
      'console.log(slack, github, aws, pem);',
      '',
    ].join('\n'));
    git(target, ['add', '.']);
    git(target, ['commit', '-m', 'add split fixtures']);

    assert.deepEqual(secretShapedLines(target), []);
  });
});

test('untracked publishable fixtures are scanned before commit', () => {
  withTempRepo((target) => {
    fs.writeFileSync(path.join(target, 'new-fixture.txt'), `fixture=${secret('xox', 'b-123456789012-123456789012-abcdefghijklmnopqrstuvwx')}\n`);

    assert.deepEqual(secretShapedLines(target), ['new-fixture.txt:1']);
  });
});

test('repository files do not contain literal secret-shaped fixtures', () => {
  assert.deepEqual(secretShapedLines(repoRoot), []);
});
