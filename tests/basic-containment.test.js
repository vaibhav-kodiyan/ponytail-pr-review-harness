#!/usr/bin/env node
// Build-owned coverage for TP-X.* in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { root, exampleServer, materialize, walk, withRepo } = require('./helpers/basic-install');

const materializerPath = path.join(root, 'rig', 'materialize.js');

function runMaterialize(target, manifest, env = {}) {
  const manifestPath = path.join(target, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  execFileSync('node', [
    materializerPath,
    '--target', target,
    '--manifest', manifestPath,
  ], {
    stdio: 'pipe',
    env: { ...process.env, ...env },
  });
}

function relFiles(target) {
  return walk(target).map((file) => path.relative(target, file));
}

test('TP-X.1 materializer writes nothing outside the target repo', () => {
  withRepo((target) => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-basic-home-'));
    const xdg = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-basic-xdg-'));
    try {
      runMaterialize(target, {
        hosts: ['openclaw', 'codewhale', 'hermes', 'windsurf', 'cline', 'copilot-cli', 'antigravity'],
        mcp_servers: [exampleServer],
      }, {
        HOME: home,
        XDG_CONFIG_HOME: xdg,
        XDG_DATA_HOME: path.join(xdg, 'data'),
        XDG_CACHE_HOME: path.join(xdg, 'cache'),
      });

      assert.deepEqual(walk(home), [], 'HOME sentinel stays empty');
      assert.deepEqual(walk(xdg), [], 'XDG sentinel stays empty');
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
      fs.rmSync(xdg, { recursive: true, force: true });
    }
  });
});

test('TP-X.2 installed repo contains static files only, with no Rig runtime', () => {
  withRepo((target) => {
    execFileSync('git', ['init', '-q'], { cwd: target, stdio: 'pipe' });
    fs.chmodSync(path.join(target, '.git', 'description'), 0o755);
    fs.chmodSync(path.join(target, '.git', 'info', 'exclude'), 0o755);
    const existingFiles = new Set(relFiles(target));
    materialize(target, { hosts: ['claude', 'cursor', 'codex'], mcp_servers: [exampleServer] });

    const files = relFiles(target).filter((rel) => rel !== '.rig-manifest.test.json' && !existingFiles.has(rel));
    assert.deepEqual(
      files.filter((rel) => /node_modules|package\.json|materialize\.js|daemon|service|runtime/i.test(rel)),
      [],
      'no installer/runtime package is copied into the target',
    );

    const allowedExecutable = new Set(['.git/hooks/pre-commit', '.rig/hooks/secret-guard.sh']);
    const unexpectedExecutables = files.filter((rel) => {
      const mode = fs.statSync(path.join(target, rel)).mode;
      return (mode & 0o111) !== 0 && !allowedExecutable.has(rel);
    });
    assert.deepEqual(unexpectedExecutables, [], 'only the git hook shim and guard script are executable');
  });
});
