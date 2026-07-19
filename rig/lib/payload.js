const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const INSTRUCTION_ONLY = ['cursor', 'windsurf', 'cline', 'kiro', 'gemini', 'copilot'];
const PAYLOAD_HOSTS = ['claude', 'codex', 'cursor', 'windsurf', 'cline', 'kiro', 'gemini', 'copilot'];

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

function runPayload(target, hosts) {
  const selected = hosts && hosts.length ? hosts : PAYLOAD_HOSTS;
  const instructionOnly = INSTRUCTION_ONLY.some((host) => selected.includes(host));
  for (const entry of loadCanonicalManifest().payload) {
    if (entry.host !== 'neutral' && !selected.includes(entry.host)) continue;
    if (entry.gate === 'instruction_only_selected' && !instructionOnly) continue;
    if (entry.op === 'copy') copyOp(target, entry.from, entry.to);
    else if (entry.op === 'ensure_line') ensureLine(target, entry.to, entry.line);
  }
}

module.exports = { ROOT, INSTRUCTION_ONLY, PAYLOAD_HOSTS, loadCanonicalManifest, copyOp, ensureLine, runPayload };
