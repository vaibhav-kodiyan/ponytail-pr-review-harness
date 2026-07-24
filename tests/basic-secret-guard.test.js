#!/usr/bin/env node
// Gate-1 acceptance test AT-4 for Tier 2 Basic — the runtime-free target-repo
// secret guard (SC6/SC7, §9). Authored in the grilling phase; the implementer
// MUST NOT edit it (gate contract). "Goes RED without the guard" is the point:
// these fail until the materializer installs the pre-commit guard, then pass.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { materialize, exampleServer, withRepo } = require('./helpers/basic-install');

const git = (target, args) => execFileSync('git', args, { cwd: target, stdio: 'pipe' });

function initRepo(target) {
  git(target, ['init', '-q']);
  git(target, ['config', 'user.email', 'test@example.com']);
  git(target, ['config', 'user.name', 'Rig Test']);
  git(target, ['config', 'commit.gpgsign', 'false']);
}

const fakeKey = ['sk-', 'ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'].join('');

test('AT-4 guard blocks a fake key and passes a ${VAR} reference', () => {
  withRepo((target) => {
    initRepo(target);
    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });

    // RED path: a value-shaped key in a staged file must be rejected.
    fs.writeFileSync(path.join(target, 'leak.txt'), `token = "${fakeKey}"\n`);
    git(target, ['add', 'leak.txt']);
    assert.throws(
      () => git(target, ['commit', '-m', 'add leak']),
      'committing a fake sk- key must be blocked by the guard',
    );

    git(target, ['reset', '-q']);
    fs.rmSync(path.join(target, 'leak.txt'));

    // GREEN path: a name-only reference must commit cleanly.
    fs.writeFileSync(path.join(target, 'ref.txt'), 'token = "${EXAMPLE_DB_TOKEN}"\n');
    git(target, ['add', 'ref.txt']);
    assert.doesNotThrow(
      () => git(target, ['commit', '-m', 'add reference']),
      'committing only a ${VAR} reference must pass the guard',
    );
  });
});

test('AT-4 guard scans staged additions instead of pre-existing file contents', () => {
  withRepo((target) => {
    initRepo(target);

    const fixture = path.join(target, 'secret-shaped-fixture.txt');
    fs.writeFileSync(fixture, `historical fixture = "${fakeKey}"\n`);
    git(target, ['add', 'secret-shaped-fixture.txt']);
    git(target, ['commit', '-m', 'add historical fixture']);

    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });

    fs.appendFileSync(fixture, 'safe staged addition\n');
    git(target, ['add', 'secret-shaped-fixture.txt']);
    assert.doesNotThrow(
      () => git(target, ['commit', '-m', 'edit fixture safely']),
      'a pre-existing secret-shaped line must not poison later edits to the file',
    );

    fs.appendFileSync(fixture, `new staged value = "${fakeKey}"\n`);
    git(target, ['add', 'secret-shaped-fixture.txt']);
    assert.throws(
      () => git(target, ['commit', '-m', 'add new leak']),
      'a newly added secret-shaped line in an existing file must still be blocked',
    );
  });
});

test('AT-4b guard blocks a tracked .env even when force-added', () => {
  withRepo((target) => {
    initRepo(target);
    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });

    fs.writeFileSync(path.join(target, '.env'), `EXAMPLE_DB_TOKEN=${fakeKey}\n`);
    git(target, ['add', '-f', '.env']); // force past .gitignore
    assert.throws(
      () => git(target, ['commit', '-m', 'add tracked env']),
      'committing a tracked .env must be blocked by the guard',
    );
  });
});
