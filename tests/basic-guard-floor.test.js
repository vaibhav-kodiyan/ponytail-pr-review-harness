#!/usr/bin/env node
// Build-owned coverage for TP-C6.1..3 in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { materialize, exampleServer, withRepo } = require('./helpers/basic-install');

const secret = (...parts) => parts.join('');

function git(target, args) {
  return execFileSync('git', args, { cwd: target, stdio: 'pipe' });
}

function initRepo(target) {
  git(target, ['init', '-q']);
  git(target, ['config', 'user.email', 'test@example.com']);
  git(target, ['config', 'user.name', 'Rig Test']);
  git(target, ['config', 'commit.gpgsign', 'false']);
}

function installedRepo(fn) {
  withRepo((target) => {
    initRepo(target);
    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });
    fn(target);
  });
}

function commitFile(target, rel, body) {
  fs.writeFileSync(path.join(target, rel), body);
  git(target, ['add', rel]);
  git(target, ['commit', '-m', `add ${rel}`]);
}

test('TP-C6.1 guard floor blocks the curated secret prefix set', () => {
  for (const [name, value] of [
    ['anthropic', secret('sk-', 'ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')],
    ['openai', secret('sk-', 'proj-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')],
    ['github-pat', secret('ghp', '_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')],
    ['github-oauth', secret('gho', '_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')],
    ['aws-access-key', secret('AKIA', 'ABCDEFGHIJKLMNOP')],
    ['slack-bot', secret('xox', 'b-123456789012-123456789012-abcdefghijklmnopqrstuvwx')],
    ['slack-app', secret('xox', 'a-2-123456789012-123456789012-abcdefghijklmnopqrstuvwx')],
    ['pem', secret('-----BEGIN ', 'PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----')],
  ]) {
    installedRepo((target) => {
      assert.throws(
        () => commitFile(target, `${name}.txt`, `token=${value}\n`),
        `${name} shaped secret must be blocked`,
      );
    });
  }
});

test('TP-C6.2 name-only reference forms pass the guard floor', () => {
  installedRepo((target) => {
    assert.doesNotThrow(() => commitFile(target, 'references.txt', [
      'token = "${EXAMPLE_DB_TOKEN}"',
      'token = "${env:EXAMPLE_DB_TOKEN}"',
      'envFile = "${workspaceFolder}/.env"',
      'bearer_token_env_var = "EXAMPLE_DB_TOKEN"',
    ].join('\n')));
  });
});

test('TP-C6.3 high-entropy non-secrets are not floor false positives', () => {
  for (const [name, body] of [
    ['sha.txt', 'commit 1234567890abcdef1234567890abcdef12345678\n'],
    ['base64.txt', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=\n'],
    ['lockfile.txt', 'integrity sha512-9V8pJ7Q7u2S9S8Gz7yN9vVxJ2lF4Z8b6n8m1Q6g4V0c8j2z9p1w==\n'],
    ['uuid.txt', 'id = "123e4567-e89b-12d3-a456-426614174000"\n'],
  ]) {
    installedRepo((target) => {
      assert.doesNotThrow(() => commitFile(target, name, body), `${name} is not a secret`);
    });
  }
});
