// Shared Gate-1 install seam + fixtures for the Tier 2 Basic acceptance tests
// (SC7 / §9 of project-dev-docs/tier-2-design-docs/basic/basic-design.md).
//
// The materializer + secret guard do not exist yet, so these acceptance tests
// are RED until the build phase ships them, then GREEN — real red-then-green.
// The invocation below is the FROZEN Gate-1 install seam: if the build wires a
// different entry point, change ONLY materialize() here — never the assertions,
// which pin observable intent, not mechanism.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..', '..');

// The single install seam. Build wires this to the real materializer. The
// input config carries { hosts, mcp_servers } (§6); Rig owns the Tier-1 payload.
function materialize(target, manifest) {
  const manifestPath = path.join(target, '.rig-manifest.test.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  execFileSync('node', [
    path.join(root, 'rig', 'materialize.js'),
    '--target', target,
    '--manifest', manifestPath,
  ], { stdio: 'pipe' });
}

// The uninstall seam — the inverse of materialize(), same frozen entry point.
// Build wires this; if it picks a different command, change ONLY this helper.
function uninstall(target) {
  execFileSync('node', [
    path.join(root, 'rig', 'materialize.js'),
    '--target', target,
    '--uninstall',
  ], { stdio: 'pipe' });
}

// One semantic server, two host-neutral variants, credentials by NAME only (SC5).
const exampleServer = {
  name: 'example-db',
  variants: [
    { id: 'stdio', transport: 'stdio', command: 'npx', args: ['-y', 'example-db-mcp'], credentials: ['EXAMPLE_DB_TOKEN'], credential_safety: 'config_only_safe' },
    { id: 'http', transport: 'http', url: 'https://db.example.com/mcp', credentials: ['EXAMPLE_DB_TOKEN'], credential_safety: 'manual_note_required' },
  ],
};

// A value-shaped secret literal must never appear in a Rig-emitted file (AT-1),
// and is exactly what the target-repo guard rejects (AT-4).
const valueShaped = /(?<![a-z0-9])sk-[a-z0-9-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/i;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function withRepo(fn) {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-basic-'));
  try {
    return fn(target);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

module.exports = { root, materialize, uninstall, exampleServer, valueShaped, walk, withRepo };
