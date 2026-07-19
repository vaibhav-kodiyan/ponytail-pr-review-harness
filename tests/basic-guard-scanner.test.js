#!/usr/bin/env node
// Build-owned coverage for TP-C6.4..8 in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { materialize, exampleServer, withRepo } = require('./helpers/basic-install');

const secret = (...parts) => parts.join('');

function git(target, args, env = {}) {
  return spawnSync('git', args, {
    cwd: target,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

function gitOk(target, args) {
  execFileSync('git', args, { cwd: target, stdio: 'pipe' });
}

function initRepo(target) {
  gitOk(target, ['init', '-q']);
  gitOk(target, ['config', 'user.email', 'test@example.com']);
  gitOk(target, ['config', 'user.name', 'Rig Test']);
  gitOk(target, ['config', 'commit.gpgsign', 'false']);
}

function installedRepo(fn) {
  withRepo((target) => {
    initRepo(target);
    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });
    const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-scanner-bin-'));
    try {
      fn(target, bin);
    } finally {
      fs.rmSync(bin, { recursive: true, force: true });
    }
  });
}

function writeScanner(bin, name, body) {
  const file = path.join(bin, name);
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
}

function stage(target, rel, body) {
  fs.writeFileSync(path.join(target, rel), body);
  gitOk(target, ['add', rel]);
}

function commit(target, bin) {
  return git(target, ['commit', '-m', 'test commit'], { PATH: `${bin}${path.delimiter}${process.env.PATH}` });
}

test('TP-C6.4 scanner tier prefers gitleaks over trufflehog', () => {
  installedRepo((target, bin) => {
    const trufflehogMarker = path.join(target, 'trufflehog-ran');
    writeScanner(bin, 'gitleaks', 'echo "gitleaks finding" >&2\nexit 1');
    writeScanner(bin, 'trufflehog', `touch "${trufflehogMarker}"\nexit 1`);
    stage(target, 'clean.txt', 'nothing secret here\n');

    const result = commit(target, bin);
    assert.notEqual(result.status, 0, 'gitleaks finding blocks the commit');
    assert.match(result.stderr + result.stdout, /gitleaks finding/, 'gitleaks output is surfaced');
    assert.equal(fs.existsSync(trufflehogMarker), false, 'trufflehog is not consulted when gitleaks exists');
  });
});

test('TP-C6.5 scanner tier falls back to trufflehog', () => {
  installedRepo((target, bin) => {
    writeScanner(bin, 'trufflehog', 'echo "trufflehog finding" >&2\nexit 1');
    stage(target, 'clean.txt', 'nothing secret here\n');

    const result = commit(target, bin);
    assert.notEqual(result.status, 0, 'trufflehog finding blocks the commit');
    assert.match(result.stderr + result.stdout, /trufflehog finding/, 'trufflehog output is surfaced');
  });
});

test('TP-C6.6 scanner is invoked against staged content', () => {
  installedRepo((target, bin) => {
    const argsFile = path.join(target, 'scanner-args.txt');
    writeScanner(bin, 'gitleaks', `printf '%s\\n' "$@" > "${argsFile}"\nexit 0`);
    stage(target, 'clean.txt', 'nothing secret here\n');

    const result = commit(target, bin);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(fs.readFileSync(argsFile, 'utf8'), /--staged|protect/, 'scanner receives a staged-scan invocation');
  });
});

test('TP-C6.7 scanner exec errors fall back to the floor verdict with a warning', () => {
  installedRepo((target, bin) => {
    writeScanner(bin, 'gitleaks', 'echo "broken gitleaks" >&2\nexit 2');
    stage(target, 'reference.txt', 'token = "${EXAMPLE_DB_TOKEN}"\n');

    const cleanResult = commit(target, bin);
    assert.equal(cleanResult.status, 0, cleanResult.stderr || cleanResult.stdout);
    assert.match(cleanResult.stderr + cleanResult.stdout, /warn|broken|fallback/i, 'broken scanner warning is surfaced');
  });

  installedRepo((target, bin) => {
    writeScanner(bin, 'gitleaks', 'echo "broken gitleaks" >&2\nexit 2');
    stage(target, 'leak.txt', `token = "${secret('sk-', 'ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')}"\n`);

    const leakResult = commit(target, bin);
    assert.notEqual(leakResult.status, 0, 'floor still blocks when scanner is broken');
    assert.match(leakResult.stderr + leakResult.stdout, /sk-ant|secret|\.env/i, 'floor finding is surfaced');
  });
});

test('TP-C6.8 floor always runs even when a scanner passes', () => {
  installedRepo((target, bin) => {
    writeScanner(bin, 'gitleaks', 'exit 0');
    stage(target, 'leak.txt', `token = "${secret('ghp', '_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')}"\n`);

    const result = commit(target, bin);
    assert.notEqual(result.status, 0, 'floor blocks despite scanner success');
    assert.match(result.stderr + result.stdout, /ghp_|secret/i, 'floor finding is surfaced');
  });
});
