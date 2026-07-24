#!/usr/bin/env node
// Antigravity PreInvocation hook — inject Rig mode before the model call.
// Contract (verify on install): JSON on stdin, JSON on stdout with `decision`.
// Overlaps Claude SessionStart / UserPromptSubmit only for instruction inject;
// do not reuse hooks/claude-codex-hooks.json on Antigravity paths.

const fs = require('node:fs');
const { getDefaultMode } = require('./rig-config');
const { getRigInstructions } = require('./rig-instructions');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  let payload = {};
  const raw = readStdin().trim();
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }
  }

  const mode = getDefaultMode();
  if (mode === 'off') {
    process.stdout.write(JSON.stringify({ decision: 'allow', ...payload }));
    return;
  }

  const additionalContext = getRigInstructions(mode);
  process.stdout.write(JSON.stringify({
    decision: 'allow',
    additionalContext,
  }));
}

main();
