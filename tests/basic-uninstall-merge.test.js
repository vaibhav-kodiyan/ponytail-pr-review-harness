#!/usr/bin/env node
// Build-owned coverage for TP-C7.* in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { materialize, uninstall, exampleServer, withRepo } = require('./helpers/basic-install');

function initRepo(target) {
  execFileSync('git', ['init', '-q'], { cwd: target, stdio: 'pipe' });
}

test('TP-C7.1 uninstall removes only the Rig server from a merged JSON host file', () => {
  withRepo((target) => {
    initRepo(target);
    fs.writeFileSync(path.join(target, '.mcp.json'), JSON.stringify({
      mcpServers: {
        userThing: { command: 'node', args: ['user-server.js'] },
      },
    }, null, 2));

    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });
    uninstall(target);

    assert.ok(fs.existsSync(path.join(target, '.mcp.json')), 'pre-existing host file is preserved');
    const config = JSON.parse(fs.readFileSync(path.join(target, '.mcp.json'), 'utf8'));
    assert.ok(config.mcpServers.userThing, 'user server remains after uninstall');
    assert.equal(config.mcpServers['example-db'], undefined, 'Rig server is removed');
  });
});

test('TP-C7.2 uninstall is idempotent when artifacts are already absent', () => {
  withRepo((target) => {
    initRepo(target);
    materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] });
    uninstall(target);

    assert.doesNotThrow(() => uninstall(target), 'second uninstall exits cleanly');
  });
});

test('TP-C7.2 uninstall is safe on a repo where Basic was never installed', () => {
  withRepo((target) => {
    initRepo(target);
    fs.writeFileSync(path.join(target, '.env'), 'EXAMPLE_DB_TOKEN=do-not-delete\n');

    assert.doesNotThrow(() => uninstall(target), 'uninstall without artifacts exits cleanly');
    assert.equal(fs.readFileSync(path.join(target, '.env'), 'utf8'), 'EXAMPLE_DB_TOKEN=do-not-delete\n');
  });
});
