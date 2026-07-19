#!/usr/bin/env node
// Tier 2 Basic install seam (frozen): orchestration only. Every install pass is
// owned by a module under rig/lib/; the canonical payload data lives in
// rig/manifest.json. This file parses args and wires the passes — nothing more.
const fs = require('node:fs');
const { loadUserConfig, validate } = require('./lib/config');
const { runPayload } = require('./lib/payload');
const { renderMcp } = require('./lib/renderers');
const { writeCredentialOutputs } = require('./lib/credentials');
const { installGuard } = require('./lib/guard');
const { writeReceipt } = require('./lib/receipt');
const { uninstall } = require('./lib/uninstall');
const { assignVariants } = require('./lib/variants');

function parseArgs(argv) {
  const args = { target: null, manifest: null, uninstall: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--target') args.target = argv[++i];
    else if (argv[i] === '--manifest') args.manifest = argv[++i];
    else if (argv[i] === '--uninstall') args.uninstall = true;
    else throw new Error(`rig: unknown argument "${argv[i]}"`);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target || !fs.existsSync(args.target)) {
    throw new Error('rig: --target <dir> is required and must exist');
  }

  if (args.uninstall) {
    uninstall(args.target);
    return;
  }

  if (!args.manifest) throw new Error('rig: --manifest <config.json> is required');

  const config = loadUserConfig(args.manifest);
  validate(config);

  runPayload(args.target, config.hosts);

  if (config.mcp_servers.length > 0) {
    const receipt = renderMcp(args.target, config);
    writeCredentialOutputs(args.target, config, receipt);
    receipt.chainedBackup = installGuard(args.target).chainedBackup;
    writeReceipt(args.target, receipt);
  }
}

module.exports = { assignVariants };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
