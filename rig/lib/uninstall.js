const fs = require('node:fs');
const path = require('node:path');
const { RECEIPT_PATH, readReceipt } = require('./receipt');

function uninstall(target) {
  const receipt = readReceipt(target) || { ownedFiles: [], mergedEntries: [] };
  for (const file of receipt.ownedFiles || []) rm(target, file);
  for (const entry of receipt.mergedEntries || []) unmerge(target, entry.file, entry.serverName);

  rm(target, '.env.example');
  rm(target, '.rig/mcp-setup.md');
  rm(target, '.rig/hooks/secret-guard.sh');
  rm(target, RECEIPT_PATH);

  const hook = path.join(target, '.git', 'hooks', 'pre-commit');
  const chained = path.join(target, '.git', 'hooks', 'pre-commit.rig-chained');
  const hasRigShim = fs.existsSync(hook) && fs.readFileSync(hook, 'utf8').includes('Rig secret guard shim');
  if (fs.existsSync(chained) && (!fs.existsSync(hook) || hasRigShim)) fs.renameSync(chained, hook);
  else if (hasRigShim) fs.rmSync(hook, { force: true });

  for (const rel of ['.rig/hooks', '.rig']) {
    const dir = path.join(target, rel);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
}

function unmerge(target, file, serverName) {
  const p = path.join(target, file);
  if (!fs.existsSync(p) || !file.endsWith('.json')) return;
  try {
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const bag of [obj.mcpServers, obj.servers, obj.mcp && obj.mcp.servers, obj.mcp]) {
      if (bag && Object.prototype.hasOwnProperty.call(bag, serverName)) delete bag[serverName];
    }
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  } catch {
    // User-owned malformed files are left untouched.
  }
}

function rm(target, rel) {
  const p = path.join(target, rel);
  if (fs.existsSync(p)) fs.rmSync(p, { force: true });
}

module.exports = { uninstall };
