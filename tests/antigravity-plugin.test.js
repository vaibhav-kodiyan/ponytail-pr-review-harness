#!/usr/bin/env node
// Smoke test for the Antigravity full-distribution adapter.
// Thin plugin over shared skills/hooks; workspace hooks.json is separate from
// Claude's map and must not land at Gemini's auto-discovered hooks/hooks.json.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const PLUGIN = 'antigravity-plugin/plugin.json';
const PINNED_SEMVER = /^\d+\.\d+\.\d+$/;

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

test('antigravity-plugin names rig with a pinned version', () => {
  assert.ok(fs.existsSync(path.join(root, PLUGIN)), `${PLUGIN} must exist`);
  const manifest = JSON.parse(read(PLUGIN));
  assert.equal(manifest.name, 'rig');
  assert.match(manifest.version, PINNED_SEMVER);
});

test('plugin bundle stays thin over shared skills and hooks', () => {
  assert.ok(fs.existsSync(path.join(root, 'antigravity-plugin/hooks.json')));
  assert.ok(fs.existsSync(path.join(root, 'antigravity-plugin/rules/rig.md')));
  assert.ok(fs.existsSync(path.join(root, 'antigravity-plugin/mcp_config.json')));
  assert.ok(fs.existsSync(path.join(root, 'antigravity-plugin/skills/README.md')));
  const mcp = read('antigravity-plugin/mcp_config.json');
  assert.match(mcp, /Tier B|~\/\.gemini\/config\/mcp_config\.json/i);
  assert.doesNotMatch(mcp, /(?<![a-z0-9])sk-[a-z0-9-]{10,}/i);
});

test('workspace hooks.json is Antigravity-shaped, not Claude\'s map', () => {
  assert.ok(fs.existsSync(path.join(root, 'hooks.json')), 'workspace hooks.json present');
  assert.equal(fs.existsSync(path.join(root, 'hooks/hooks.json')), false, 'Gemini auto-path must stay empty');
  const body = read('hooks.json');
  assert.match(body, /PreInvocation|PreToolUse|PostToolUse/);
  assert.doesNotMatch(body, /SessionStart|UserPromptSubmit/);
  assert.doesNotMatch(body, /claude-codex-hooks/);
  assert.ok(fs.existsSync(path.join(root, 'hooks/rig-antigravity-pre-invocation.js')));
  assert.ok(fs.existsSync(path.join(root, 'hooks/rig-antigravity-tool.js')));
});

test('Antigravity PreInvocation hook emits a JSON allow decision', () => {
  const { execFileSync } = require('node:child_process');
  const out = execFileSync(
    'node',
    [path.join(root, 'hooks/rig-antigravity-pre-invocation.js')],
    { input: '{"conversationId":"test"}', encoding: 'utf8' },
  );
  const parsed = JSON.parse(out);
  assert.equal(parsed.decision, 'allow');
  assert.ok(parsed.additionalContext && parsed.additionalContext.length > 0);
});
