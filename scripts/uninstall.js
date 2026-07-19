#!/usr/bin/env node
// rig — removes state rig wrote outside the plugin's own files:
// the mode flag, the config file, and the statusLine entry it added to
// settings.json. Plugin files themselves are removed by each host's own
// uninstall command (see README); this only cleans up what those commands
// can't see.

const fs = require('fs');
const path = require('path');
const { getConfigPath, getClaudeDir } = require('../hooks/rig-config');

function removeIfExists(filePath, label) {
  try {
    fs.unlinkSync(filePath);
    console.log(`Removed ${label}: ${filePath}`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

removeIfExists(path.join(getClaudeDir(), '.rig-active'), 'mode flag');
removeIfExists(getConfigPath(), 'config file');

const settingsPath = path.join(getClaudeDir(), 'settings.json');
try {
  const raw = fs.readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, '');
  const settings = JSON.parse(raw);
  const cmd = settings.statusLine && settings.statusLine.command;
  // Only remove the statusLine if rig owns the whole command. If the user
  // combined it with another statusline (e.g. caveman && rig), deleting the
  // key or the command field would destroy the other plugin's part, so leave it
  // and tell them to strip rig's segment by hand.
  // rig: splits on && / ; to detect other segments — good enough; a user
  // piping statuslines together is on their own.
  if (typeof cmd === 'string' && cmd.includes('rig-statusline')) {
    const others = cmd
      .split(/&&|;/)
      .map((s) => s.trim())
      .filter((s) => s && !s.includes('rig-statusline'));
    if (others.length === 0) {
      delete settings.statusLine;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      console.log(`Removed rig statusLine entry from ${settingsPath}`);
    } else {
      console.log(
        `Left your combined statusLine in ${settingsPath} untouched; remove the rig-statusline part by hand.`,
      );
    }
  }
} catch (e) {
  if (e.code === 'ENOENT') {
    // no settings.json — nothing to clean
  } else if (e instanceof SyntaxError) {
    // rig: malformed settings.json — can't safely edit it; leave intact, warn
    console.warn(`settings.json is malformed — could not remove the rig statusLine entry. Remove it manually from: ${settingsPath} (${e.message})`);
  } else {
    throw e;
  }
}
