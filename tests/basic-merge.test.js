#!/usr/bin/env node
// Build-owned coverage for TP-C4.12..14 in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { materialize, exampleServer, walk, withRepo } = require('./helpers/basic-install');

function snapshot(target) {
  const files = {};
  for (const file of walk(target)) {
    const rel = path.relative(target, file);
    if (rel === '.rig-manifest.test.json') continue;
    files[rel] = fs.readFileSync(file, 'utf8');
  }
  return files;
}

test('TP-C4.12 JSON host merge preserves existing user servers', () => {
  withRepo((target) => {
    fs.writeFileSync(path.join(target, '.mcp.json'), JSON.stringify({
      mcpServers: {
        userThing: { command: 'node', args: ['user-server.js'] },
      },
    }, null, 2));

    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });

    const config = JSON.parse(fs.readFileSync(path.join(target, '.mcp.json'), 'utf8'));
    assert.ok(config.mcpServers.userThing, 'pre-existing user server remains');
    assert.ok(config.mcpServers['example-db'], 'Rig server is added');
  });
});

test('TP-C4.13 Codex TOML append keeps existing server blocks untouched', () => {
  withRepo((target) => {
    fs.mkdirSync(path.join(target, '.codex'), { recursive: true });
    fs.writeFileSync(
      path.join(target, '.codex/config.toml'),
      '[mcp_servers.other]\ncommand = "node"\nargs = ["other.js"]\n',
    );

    materialize(target, { hosts: ['codex'], mcp_servers: [exampleServer] });

    const body = fs.readFileSync(path.join(target, '.codex/config.toml'), 'utf8');
    assert.match(body, /\[mcp_servers\.other\]\ncommand = "node"\nargs = \["other\.js"\]/, 'user block remains byte-stable');
    assert.match(body, /\[mcp_servers\.example-db\]/, 'Rig block is appended');
  });
});

test('TP-C4.14 re-install is idempotent and byte-stable', () => {
  withRepo((target) => {
    const manifest = { hosts: ['claude', 'cursor', 'codex'], mcp_servers: [exampleServer] };
    materialize(target, manifest);
    const once = snapshot(target);
    materialize(target, manifest);
    assert.deepEqual(snapshot(target), once, 'second install produces no duplicate keys or blocks');
  });
});
