#!/usr/bin/env node
// Build-owned architecture coverage for the Tier 2 Basic install seam.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./helpers/basic-install');

const cliPath = path.join(root, 'rig', 'materialize.js');
const payloadPath = path.join(root, 'rig', 'lib', 'payload.js');
const canonicalManifestPath = path.join(root, 'rig', 'manifest.json');
const read = (file) => fs.readFileSync(file, 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('TP-X.3 materialize.js delegates every install pass to rig/lib', () => {
  const source = read(cliPath);
  const boundaries = [
    ['./lib/config', ['loadUserConfig', 'validate']],
    ['./lib/payload', ['runPayload']],
    ['./lib/renderers', ['renderMcp']],
    ['./lib/credentials', ['writeCredentialOutputs']],
    ['./lib/guard', ['installGuard']],
    ['./lib/receipt', ['writeReceipt']],
    ['./lib/uninstall', ['uninstall']],
  ];

  for (const [modulePath, operations] of boundaries) {
    assert.ok(new RegExp(`require\\(['"]${escapeRegExp(modulePath)}['"]\\)`).test(source), `CLI imports ${modulePath}`);
    for (const operation of operations) {
      assert.ok(new RegExp(`\\b${operation}\\s*\\(`).test(source), `CLI delegates ${operation}()`);
    }
  }
});

test('TP-X.4 materialize.js is orchestration-only, not a second implementation', () => {
  const source = read(cliPath);
  const lines = source.split('\n').length;
  assert.ok(lines <= 120, `CLI must stay thin (found ${lines} lines; limit is 120)`);

  const forbidden = [
    [/\b(?:HOSTS|HOST_TIER|SUPPORTED_HOSTS)\s*=/, 'host matrix'],
    [/\b(?:PAYLOAD|FALLBACK_SKILLS)\s*=/, 'payload list'],
    [/\bfunction\s+(?:assignVariants|render[A-Z]\w*|mergeJson|appendTomlBlock)\b/, 'variant or renderer implementation'],
    [/\bfunction\s+(?:secretGuardScript|preCommitShim|installGuard|uninstallGuard)\b/, 'guard implementation'],
    [/\bfunction\s+(?:writeEnvExample|renderSetupNotes|addSetupNote)\b/, 'credential output implementation'],
    [/\bfunction\s+(?:uninstall|removeJsonServers|removeTomlServers)\b/, 'uninstall implementation'],
    [/sk-\[|AKIA\[|PRIVATE KEY|xox\[baprs\]/, 'secret-scanner patterns'],
  ];

  for (const [pattern, responsibility] of forbidden) {
    assert.ok(!pattern.test(source), `CLI must not own ${responsibility}`);
  }

  const declarations = [...source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]);
  assert.deepEqual(
    declarations.filter((name) => !['parseArgs', 'main'].includes(name)),
    [],
    'CLI declares only argument parsing and orchestration functions',
  );
});

test('TP-X.5 canonical payload data is owned by rig/manifest.json and loaded by payload.js', () => {
  const manifest = JSON.parse(read(canonicalManifestPath));
  assert.ok(Array.isArray(manifest.payload) && manifest.payload.length > 0, 'canonical manifest contains payload operations');

  const payloadSource = read(payloadPath);
  assert.ok(/['"]rig['"]\s*,\s*['"]manifest\.json['"]/.test(payloadSource), 'payload module loads rig/manifest.json');

  const cliSource = read(cliPath);
  assert.ok(!/\bconst\s+(?:PAYLOAD|FALLBACK_SKILLS)\b/.test(cliSource), 'CLI does not duplicate canonical payload data');
});
