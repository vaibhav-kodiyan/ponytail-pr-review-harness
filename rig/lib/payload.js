const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
// Antigravity co-reads `.agents/skills` natively and also gets `.rig/skills` as
// the instruction-only fallback (same gate as cursor/gemini/etc.).
const INSTRUCTION_ONLY = [
  'cursor', 'windsurf', 'cline', 'kiro', 'gemini', 'copilot', 'antigravity',
];
const PAYLOAD_HOSTS = [
  'claude', 'codex', 'antigravity', 'cursor', 'windsurf', 'cline', 'kiro', 'gemini', 'copilot',
];

function loadCanonicalManifest() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'rig', 'manifest.json'), 'utf8'));
}

function copyOp(target, from, to) {
  const dst = path.join(target, to);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(ROOT, from), dst);
}

function ensureLine(target, to, line) {
  const file = path.join(target, to);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!body.split('\n').includes(line)) fs.writeFileSync(file, `${body}\n${line}\n`);
}

// `host` may be a string, or an array of hosts that share one payload entry.
function hostSelected(entryHost, selected) {
  if (entryHost === 'neutral') return true;
  const hosts = Array.isArray(entryHost) ? entryHost : [entryHost];
  return hosts.some((host) => selected.includes(host));
}

function runPayload(target, hosts) {
  const selected = hosts && hosts.length ? hosts : PAYLOAD_HOSTS;
  const instructionOnly = INSTRUCTION_ONLY.some((host) => selected.includes(host));
  for (const entry of loadCanonicalManifest().payload) {
    if (!hostSelected(entry.host, selected)) continue;
    if (entry.gate === 'instruction_only_selected' && !instructionOnly) continue;
    if (entry.op === 'copy') copyOp(target, entry.from, entry.to);
    else if (entry.op === 'ensure_line') ensureLine(target, entry.to, entry.line);
  }
}

module.exports = {
  ROOT, INSTRUCTION_ONLY, PAYLOAD_HOSTS,
  loadCanonicalManifest, copyOp, ensureLine, hostSelected, runPayload,
};
