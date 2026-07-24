#!/usr/bin/env node
// Build-owned coverage for TP-C3.* in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, materialize, walk, withRepo } = require('./helpers/basic-install');

const materializerPath = path.join(root, 'rig', 'materialize.js');

function loadAssignVariants() {
  assert.ok(fs.existsSync(materializerPath), 'rig/materialize.js exists');
  delete require.cache[require.resolve(materializerPath)];
  const materializer = require(materializerPath);
  assert.equal(typeof materializer.assignVariants, 'function', 'materializer exports assignVariants()');
  return materializer.assignVariants;
}

function variant(id, transport) {
  if (transport === 'stdio') {
    return { id, transport, command: 'node', args: [`${id}.js`], credentials: ['EXAMPLE_DB_TOKEN'], credential_safety: 'config_only_safe' };
  }
  return { id, transport, url: `https://${id}.example.com/mcp`, credentials: ['EXAMPLE_DB_TOKEN'], credential_safety: 'manual_note_required' };
}

function emittedText(target) {
  return walk(target)
    .filter((file) => !file.endsWith('.rig-manifest.test.json'))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
}

function hostVariantIds(assignments) {
  return Object.fromEntries(
    Object.entries(assignments).map(([host, chosen]) => [host, typeof chosen === 'string' ? chosen : chosen.id]),
  );
}

test('TP-C3.1 variant assignment minimizes distinct variants', () => {
  const assignVariants = loadAssignVariants();
  const assignments = assignVariants(
    { name: 'shared', variants: [variant('stdio', 'stdio'), variant('http', 'http')] },
    ['claude', 'cursor', 'codex'],
    {
      claude: ['stdio', 'http'],
      cursor: ['stdio', 'http'],
      codex: ['stdio', 'http'],
    },
  );

  assert.deepEqual(
    new Set(Object.values(hostVariantIds(assignments))),
    new Set(['http']),
    'all multi-capable hosts share the lexical winning variant',
  );
});

test('TP-C3.2 cover uses two variants when no single variant spans every host', () => {
  const assignVariants = loadAssignVariants();
  const assignments = assignVariants(
    { name: 'split', variants: [variant('http', 'http'), variant('stdio', 'stdio')] },
    ['stdio-only', 'http-only'],
    {
      'stdio-only': ['stdio'],
      'http-only': ['http'],
    },
  );

  assert.deepEqual(
    new Set(Object.values(hostVariantIds(assignments))),
    new Set(['stdio', 'http']),
    'minimum cover spans both required transports',
  );
});

test('TP-C3.3 lexical id tie-break is deterministic', () => {
  const assignVariants = loadAssignVariants();
  const server = { name: 'tie', variants: [variant('z-stdio', 'stdio'), variant('a-stdio', 'stdio')] };
  const hosts = ['one', 'two'];
  const support = { one: ['stdio'], two: ['stdio'] };

  assert.deepEqual(hostVariantIds(assignVariants(server, hosts, support)), {
    one: 'a-stdio',
    two: 'a-stdio',
  });
  assert.deepEqual(hostVariantIds(assignVariants(server, hosts, support)), {
    one: 'a-stdio',
    two: 'a-stdio',
  });
});

test('TP-C3.4 uncoverable selected host fails with an actionable compatibility error', () => {
  const assignVariants = loadAssignVariants();
  assert.throws(
    () => assignVariants(
      { name: 'http-only', variants: [variant('http', 'http')] },
      ['stdio-only'],
      { 'stdio-only': ['stdio'] },
    ),
    /stdio-only.*http|http.*stdio-only|compatible|transport/i,
  );
});

test('TP-C3.5 one semantic server emits one entry per host, not per-host duplicates', () => {
  withRepo((target) => {
    materialize(target, {
      hosts: ['claude', 'cursor', 'codex'],
      mcp_servers: [{ name: 'example-db', variants: [variant('stdio', 'stdio'), variant('http', 'http')] }],
    });

    for (const rel of ['.mcp.json', '.cursor/mcp.json', '.codex/config.toml']) {
      const body = fs.readFileSync(path.join(target, rel), 'utf8');
      assert.equal(
        (body.match(/example-db/g) || []).length,
        1,
        `${rel} has one entry for the semantic server`,
      );
    }
    assert.equal(
      (emittedText(target).match(/server_for_|example-db-(?:claude|cursor|codex)/g) || []).length,
      0,
      'manifest fan-out does not create per-host server names',
    );
  });
});
