#!/usr/bin/env node
// Build-owned coverage for TP-C1.* in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { validate } = require('../rig/lib/config');
const { root, materialize, exampleServer, withRepo } = require('./helpers/basic-install');

const materializerPath = path.join(root, 'rig', 'materialize.js');
const secret = (...parts) => parts.join('');

function manifestWith(server, hosts = ['claude']) {
  return { hosts, mcp_servers: [server] };
}

function assertInvalid(manifest, pattern) {
  assert.throws(() => validate(manifest), pattern);
}

function runCli(target, manifest) {
  const manifestPath = path.join(target, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return execFileSync('node', [
    materializerPath,
    '--target', target,
    '--manifest', manifestPath,
  ], { stdio: 'pipe' });
}

test('TP-C1.1 validator rejects a server missing required name', () => {
  assertInvalid(
    manifestWith({ variants: exampleServer.variants }),
    /name/i,
  );
});

test('TP-C1.2 validator rejects an unknown transport enum', () => {
  assertInvalid(
    manifestWith({
      name: 'bad-transport',
      variants: [{ id: 'grpc', transport: 'grpc', url: 'https://example.com', credentials: [] }],
    }),
    /transport.*stdio.*http/i,
  );
});

test('TP-C1.3 validator rejects an unknown credential_safety enum when present', () => {
  assertInvalid(
    manifestWith({
      name: 'bad-safety',
      variants: [{
        id: 'stdio',
        transport: 'stdio',
        command: 'node',
        args: ['server.js'],
        credentials: [],
        credential_safety: 'safe',
      }],
    }),
    /credential_safety.*config_only_safe.*manual_note_required/i,
  );
});

test('TP-C1.3b validator rejects a variant with credential_safety omitted', () => {
  assertInvalid(
    manifestWith({
      name: 'missing-safety',
      variants: [{
        id: 'stdio',
        transport: 'stdio',
        command: 'node',
        args: ['server.js'],
        credentials: [],
      }],
    }),
    /credential_safety.*config_only_safe.*manual_note_required/i,
  );
});

test('TP-C1.4 validator rejects stdio variants without command and args', () => {
  assertInvalid(
    manifestWith({
      name: 'bad-stdio',
      variants: [{ id: 'stdio', transport: 'stdio', credentials: [], credential_safety: 'config_only_safe' }],
    }),
    /stdio.*command.*args/i,
  );
});

test('TP-C1.5 validator rejects http variants without a url', () => {
  assertInvalid(
    manifestWith({
      name: 'bad-http',
      variants: [{ id: 'http', transport: 'http', credentials: [], credential_safety: 'manual_note_required' }],
    }),
    /http.*url/i,
  );
});

test('TP-C1.6 validator rejects value-shaped credentials', () => {
  assertInvalid(
    manifestWith({
      name: 'literal-secret',
      variants: [{
        id: 'stdio',
        transport: 'stdio',
        command: 'node',
        args: ['server.js'],
        credentials: [secret('sk-', 'ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')],
        credential_safety: 'config_only_safe',
      }],
    }),
    /credentials.*name/i,
  );
});

test('TP-C1.6a validator rejects name-shaped GitHub credential values', () => {
  for (const credential of [
    secret('ghp', '_aaaaaaaaaaaaaaaaaaaa'),
    secret('gho', '_aaaaaaaaaaaaaaaaaaaa'),
  ]) {
    assertInvalid(
      manifestWith({
        name: 'literal-github-secret',
        variants: [{
          id: 'stdio',
          transport: 'stdio',
          command: 'node',
          args: ['server.js'],
          credentials: [credential],
          credential_safety: 'config_only_safe',
        }],
      }),
      /credentials.*name/i,
    );
  }
});

test('TP-C1.6b CLI rejects a GitHub credential value before emitting outputs', () => {
  withRepo((target) => {
    const manifest = manifestWith({
      name: 'literal-github-secret',
      variants: [{
        id: 'stdio',
        transport: 'stdio',
        command: 'node',
        args: ['server.js'],
        credentials: [secret('ghp', '_aaaaaaaaaaaaaaaaaaaa')],
        credential_safety: 'config_only_safe',
      }],
    });

    assert.throws(
      () => materialize(target, manifest),
      (error) => /credentials.*name/i.test(`${error.stdout || ''}${error.stderr || ''}${error.message}`),
      'CLI reports that credential slots accept names only',
    );
    for (const rel of ['.env.example', '.mcp.json', '.rig/basic-receipt.json']) {
      assert.equal(fs.existsSync(path.join(target, rel)), false, `${rel} is not emitted`);
    }
  });
});

test('TP-C1.7 unknown host is a hard validation and CLI error', () => {
  assertInvalid(
    { hosts: ['notahost'], mcp_servers: [exampleServer] },
    /notahost/i,
  );

  withRepo((target) => {
    assert.throws(
      () => runCli(target, { hosts: ['notahost'], mcp_servers: [exampleServer] }),
      (error) => /notahost/i.test(`${error.stdout || ''}${error.stderr || ''}${error.message}`),
      'CLI error names the unknown host',
    );
  });
});

test('TP-C1.8 valid manifest validates and materializes', () => {
  assert.doesNotThrow(() => validate({ hosts: ['claude'], mcp_servers: [exampleServer] }));

  withRepo((target) => {
    assert.doesNotThrow(
      () => materialize(target, { hosts: ['claude'], mcp_servers: [exampleServer] }),
      'valid manifest materializes through the frozen seam',
    );
  });
});
