#!/usr/bin/env node
// rig — Claude Code SubagentStart hook
//
// SessionStart context is parent-thread only and never reaches subagents, so
// without this every Task-spawned agent runs rig-unaware (issue #252).
// When rig mode is active, inject the same ruleset into each subagent.

const { getRigInstructions } = require('./rig-instructions');
const { readMode, writeHookOutput } = require('./rig-runtime');

const mode = readMode();

// Absent flag or off → rig isn't active; inject nothing.
if (!mode || mode === 'off') {
  process.exit(0);
}

try {
  writeHookOutput('SubagentStart', mode, getRigInstructions(mode));
} catch (e) {
  // Silent fail — a stdout error at hook exit must not surface as a hook failure.
}
