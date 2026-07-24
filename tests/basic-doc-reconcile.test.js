#!/usr/bin/env node
// Build-owned coverage for TP-C8.* in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./helpers/basic-install');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function portabilityRow(host) {
  return read('docs/agent-portability.md')
    .split('\n')
    .find((line) => line.startsWith(`| ${host} |`)) || '';
}

test('TP-C8.1 agent portability matrix includes OpenClaw and Devin rows', () => {
  assert.match(portabilityRow('OpenClaw'), /\| OpenClaw \|/, 'OpenClaw row exists');
  assert.match(portabilityRow('Devin'), /\| Devin \|/, 'Devin row exists');
});

test('TP-C8.2 only Generic carries the no-MCP instruction-tier label', () => {
  for (const host of ['Antigravity', 'CodeWhale', 'Swival']) {
    assert.doesNotMatch(
      portabilityRow(host),
      /instruction-tier|may have no MCP|no MCP/i,
      `${host} is not mislabeled as no-MCP instruction-tier`,
    );
  }

  assert.match(portabilityRow('Generic agents'), /instruction-tier|no MCP/i, 'Generic remains the no-MCP row');
});

test('TP-C8.3 localized READMEs include a Hermes install section', () => {
  for (const rel of ['README.es.md', 'README.ko.md']) {
    const body = read(rel);
    assert.match(body, /Hermes Agent|Hermes/i, `${rel} mentions Hermes`);
    assert.match(body, /plugin\.yaml|hermes/i, `${rel} includes Hermes install details`);
  }
});

test('English README discovers full plugin distribution installs', () => {
  const body = read('README.md');
  assert.match(body, /## Install Full Plugin Distribution/, 'README has a full distribution section');
  assert.match(body, /### Hermes Agent/, 'README includes the Hermes install section');
  for (const command of [
    /copilot plugin marketplace add qaynel\/Rig/,
    /copilot plugin install rig@rig/,
    /swival skills add https:\/\/github\.com\/qaynel\/Rig/,
    /clawhub install rig/,
    /devin plugins install qaynel\/Rig/,
  ]) {
    assert.match(body, command);
  }
});

test('agent portability matrix does not point OpenClaw or Devin at translated READMEs', () => {
  const body = read('docs/agent-portability.md');
  assert.doesNotMatch(body, /README\.es\/ko install sections/);
});
