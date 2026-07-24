#!/usr/bin/env node
// Antigravity PreToolUse / PostToolUse stub — always allow.
// Reuse point for future guardrails that overlap Claude tool hooks.
// Contract (verify on install): JSON stdin → JSON stdout with `decision`.

const fs = require('node:fs');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

const raw = readStdin().trim();
let payload = {};
if (raw) {
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }
}

process.stdout.write(JSON.stringify({ decision: 'allow', ...payload }));
