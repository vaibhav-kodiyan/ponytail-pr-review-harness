const fs = require('node:fs');
const path = require('node:path');
const { ensureLine } = require('./payload');

const LOAD_STEP = 'set -a; source .env; set +a';
const WIRING = {
  openclaw: 'export OPENCLAW_CONFIG_PATH=./.openclaw/openclaw.json',
  codewhale: 'export DEEPSEEK_MCP_CONFIG=./.codewhale/mcp.json',
};
const CAVEAT = {
  openclaw: 'Confirm on first wire that ${VAR} interpolation is honored inside mcp.servers.',
  codewhale: 'Confirm on first wire whether the mcp_config_path overlay can replace DEEPSEEK_MCP_CONFIG.',
  // Tier B: documented project scope exists, but no value-free credential
  // syntax is documented; stay note-only until PD7 flips.
  antigravity: 'Edit .agents/mcp_config.json for this workspace or ~/.gemini/config/mcp_config.json globally (stdio command/args/env, or serverUrl + authProviderType). Do not commit secrets; use the shell env for stdio and a supported auth provider for remote servers.',
};
const LABELS = {
  claude: 'Claude',
  codex: 'Codex',
  cursor: 'Cursor',
  copilot: 'GitHub Copilot',
  opencode: 'OpenCode',
  pi: 'pi',
  gemini: 'Gemini',
  kiro: 'Kiro',
  devin: 'Devin',
  openclaw: 'OpenClaw',
  codewhale: 'CodeWhale',
  swival: 'Swival',
  hermes: 'Hermes',
  windsurf: 'Windsurf',
  cline: 'Cline',
  'copilot-cli': 'Copilot CLI',
  antigravity: 'Antigravity',
  generic: 'Generic',
  'vscode-codex': 'Codex',
};

function writeEnvExample(target, names) {
  fs.writeFileSync(path.join(target, '.env.example'), names.map((name) => `${name}=`).join('\n') + (names.length ? '\n' : ''));
}

function gitignoreEnv(target) {
  ensureLine(target, '.gitignore', '.env');
  ensureLine(target, '.gitignore', '!.env.example');
}

// Each host block is a single `\n`-joined stanza starting with `Display:`; blocks
// are `\n\n`-separated so a reader (and TP-C9) can slice one host at a time.
function writeMcpSetup(target, receipt) {
  const blocks = [];
  for (const host of receipt.noteHosts || []) {
    const lines = [`${LABELS[host] || host}:`];
    if (WIRING[host]) lines.push(WIRING[host]);
    lines.push(LOAD_STEP);
    if (host === 'codex' || host === 'vscode-codex') lines.push('Never paste the key into config.toml; use env_vars or bearer_token_env_var by name.');
    if (CAVEAT[host]) lines.push(CAVEAT[host]);
    const block = lines.join('\n');
    if (!blocks.includes(block)) blocks.push(block);
  }
  for (const host of receipt.tierC || []) {
    blocks.push(`${LABELS[host] || host}: no MCP renderer is emitted; instruction payload only.`);
  }
  const body = blocks.length ? blocks : ['No manual MCP credential setup is required for the selected hosts.'];
  const doc = ['# Rig MCP setup', '', ...body, ''].join('\n\n');
  fs.mkdirSync(path.join(target, '.rig'), { recursive: true });
  fs.writeFileSync(path.join(target, '.rig', 'mcp-setup.md'), doc);
}

function pointReadme(target) {
  ensureLine(target, 'README.md', 'See `.rig/mcp-setup.md` for MCP server setup.');
}

function writeCredentialOutputs(target, config, receipt) {
  writeEnvExample(target, receipt.credentialNames || []);
  gitignoreEnv(target);
  writeMcpSetup(target, receipt);
  pointReadme(target);
}

module.exports = { writeCredentialOutputs, writeEnvExample, gitignoreEnv, writeMcpSetup, pointReadme, LOAD_STEP };
