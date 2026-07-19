#!/usr/bin/env node
// Build-owned coverage for TP-C5.* in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { materialize, exampleServer, withRepo } = require('./helpers/basic-install');

const read = (target, rel) => fs.readFileSync(path.join(target, rel), 'utf8');
const stdioOnly = { ...exampleServer, variants: [exampleServer.variants.find((v) => v.transport === 'stdio')] };
const httpOnly = { ...exampleServer, variants: [exampleServer.variants.find((v) => v.transport === 'http')] };

test('TP-C5.1 setup note is a per-host copy-pasteable runbook', () => {
  withRepo((target) => {
    materialize(target, {
      hosts: ['claude', 'codex', 'openclaw', 'codewhale', 'devin'],
      mcp_servers: [httpOnly],
    });

    const note = read(target, '.rig/mcp-setup.md');
    for (const host of ['Claude', 'Codex', 'OpenClaw', 'CodeWhale', 'Devin']) {
      assert.match(note, new RegExp(host, 'i'), `note has a ${host} block`);
    }
    assert.match(note, /set -a;\s*source \.env;\s*set \+a/, 'note includes the SC4 env-load step');
    assert.match(note, /export OPENCLAW_CONFIG_PATH=\.\/\.openclaw\/openclaw\.json/, 'OpenClaw wiring export is copy-pasteable');
    assert.match(note, /export DEEPSEEK_MCP_CONFIG=\.\/\.codewhale\/mcp\.json/, 'CodeWhale wiring export is copy-pasteable');
    assert.match(note, /never paste.*key.*config\.toml/i, 'Codex warning says not to paste keys into config.toml');
  });
});

test('TP-C5.2 README gets one pointer line and not the setup body', () => {
  withRepo((target) => {
    fs.writeFileSync(path.join(target, 'README.md'), '# Project\n');

    const manifest = { hosts: ['claude'], mcp_servers: [stdioOnly] };
    materialize(target, manifest);
    materialize(target, manifest);

    const readme = read(target, 'README.md');
    assert.equal((readme.match(/\.rig\/mcp-setup\.md/g) || []).length, 1, 'README pointer is not duplicated');
    assert.doesNotMatch(readme, /set -a;\s*source \.env;\s*set \+a/, 'README does not inline setup body');
    assert.doesNotMatch(read(target, '.env.example'), /\.rig\/mcp-setup\.md|set -a|source \.env/, '.env.example only contains blank slots');
  });
});

test('TP-C5.3 config_only_safe Cursor stdio gets no manual note', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['cursor'], mcp_servers: [stdioOnly] });

    assert.match(read(target, '.cursor/mcp.json'), /envFile/i, 'Cursor stdio loads .env through config');
    assert.doesNotMatch(read(target, '.rig/mcp-setup.md'), /Cursor/i, 'Cursor stdio has no manual note');
  });
});

test('TP-C5.3 mirror: Cursor http gets a manual note', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['cursor'], mcp_servers: [httpOnly] });

    assert.doesNotMatch(read(target, '.cursor/mcp.json'), /envFile/i, 'Cursor http has no envFile loader');
    assert.match(read(target, '.rig/mcp-setup.md'), /Cursor/i, 'Cursor http has a manual note');
  });
});

test('TP-C5.4 default-host setup emits the shared Codex block once', () => {
  withRepo((target) => {
    materialize(target, { mcp_servers: [stdioOnly] });

    const note = read(target, '.rig/mcp-setup.md');
    assert.equal((note.match(/^Codex:$/gm) || []).length, 1, 'Codex and VS Code Codex share one setup block');
  });
});

// TP-C9 (Task 9): the two renderers shipping on unverified host assumptions
// must carry their "confirm on first wire" caveat verbatim, inside their own
// setup block, and nowhere else. Canonical text:
// project-dev-docs/tier-2-design-docs/basic/first-wire-caveats.md
function hostBlock(target, display) {
  const block = read(target, '.rig/mcp-setup.md').split('\n\n').find((b) => b.startsWith(`${display}:`));
  assert.ok(block, `${display} block exists in .rig/mcp-setup.md`);
  return block;
}

test('TP-C9 OpenClaw setup block carries its exact first-wire caveat', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['openclaw'], mcp_servers: [stdioOnly] });

    const lines = hostBlock(target, 'OpenClaw').split('\n');
    assert.ok(
      lines.includes('Confirm on first wire that ${VAR} interpolation is honored inside mcp.servers.'),
      'OpenClaw block contains the ${VAR}-in-mcp.servers caveat verbatim'
    );
  });
});

test('TP-C9 CodeWhale setup block carries its exact first-wire caveat', () => {
  withRepo((target) => {
    materialize(target, { hosts: ['codewhale'], mcp_servers: [httpOnly] });

    const lines = hostBlock(target, 'CodeWhale').split('\n');
    assert.ok(
      lines.includes('Confirm on first wire whether the mcp_config_path overlay can replace DEEPSEEK_MCP_CONFIG.'),
      'CodeWhale block contains the mcp_config_path overlay caveat verbatim'
    );
  });
});

test('TP-C9 first-wire caveats do not leak into other host blocks', () => {
  withRepo((target) => {
    materialize(target, {
      hosts: ['claude', 'codex', 'openclaw', 'codewhale', 'devin'],
      mcp_servers: [httpOnly],
    });

    const note = read(target, '.rig/mcp-setup.md');
    assert.equal((note.match(/Confirm on first wire/g) || []).length, 2, 'exactly two caveat lines in the whole note');
    for (const display of ['Claude', 'Codex', 'Devin']) {
      assert.doesNotMatch(hostBlock(target, display), /first wire/i, `${display} block has no caveat`);
    }
  });
});
