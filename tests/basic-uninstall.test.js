#!/usr/bin/env node
// Gate-1 acceptance test AT-5 for Tier 2 Basic — repo-local uninstall (§10).
// Authored in the grilling phase to close the C7 gate (§11); the implementer
// MUST NOT edit it (gate contract). RED until the materializer implements
// `--uninstall`, then GREEN. This is Basic's OWN uninstall — NOT the legacy
// scripts/uninstall.js plugin-runtime path (CLAUDE.md forbids reusing it).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { materialize, uninstall, exampleServer, withRepo } = require('./helpers/basic-install');

function initRepo(target) {
  execFileSync('git', ['init', '-q'], { cwd: target, stdio: 'pipe' });
}

test('AT-5 uninstall removes Rig-emitted MCP config, hook, and .env.example — but never the .env', () => {
  withRepo((target) => {
    initRepo(target);
    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });

    // The user's real secret file — uninstall must leave it untouched.
    const userEnv = ['EXAMPLE_DB_TOKEN=sk-', 'ant-api03-REALVALUEDONOTDELETE\n'].join('');
    fs.writeFileSync(path.join(target, '.env'), userEnv);

    // Sanity: install produced the artifacts uninstall is responsible for.
    const removed = ['.mcp.json', '.env.example', '.rig/mcp-setup.md', '.rig/hooks/secret-guard.sh', '.git/hooks/pre-commit'];
    for (const rel of removed) {
      assert.ok(fs.existsSync(path.join(target, rel)), `precondition: ${rel} was installed`);
    }

    uninstall(target);

    // All Rig-emitted install artifacts are gone.
    for (const rel of removed) {
      assert.equal(fs.existsSync(path.join(target, rel)), false, `${rel} removed by uninstall`);
    }

    // The user's .env is preserved byte-for-byte (leave the user's .env alone).
    assert.equal(fs.readFileSync(path.join(target, '.env'), 'utf8'), userEnv, '.env preserved untouched');
  });
});

test('AT-5b uninstall restores a pre-existing pre-commit hook it chained', () => {
  withRepo((target) => {
    initRepo(target);

    // A hook the user had before Rig — the chained shim (SC6d) must restore it.
    const hookDir = path.join(target, '.git', 'hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    const original = '#!/bin/sh\necho "user hook"\n';
    fs.writeFileSync(path.join(hookDir, 'pre-commit'), original, { mode: 0o755 });

    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });
    uninstall(target);

    assert.equal(
      fs.readFileSync(path.join(hookDir, 'pre-commit'), 'utf8'),
      original,
      'the user\'s original pre-commit hook is restored',
    );
  });
});
