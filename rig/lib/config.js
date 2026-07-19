const fs = require('node:fs');

const TRANSPORTS = ['stdio', 'http'];
const CREDENTIAL_SAFETY = ['config_only_safe', 'manual_note_required'];
const SUPPORTED_HOSTS = [
  'claude', 'codex', 'cursor', 'windsurf', 'cline', 'kiro', 'gemini', 'copilot',
  'opencode', 'pi', 'hermes', 'copilot-cli', 'antigravity', 'codewhale',
  'openclaw', 'devin', 'swival', 'vscode-codex', 'generic',
];
const NAME_ONLY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const VALUE_SHAPED = /(?<![a-z0-9])sk-[a-z0-9-]{10,}|gh[po]_[a-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/i;

function loadUserConfig(manifestPath) {
  const config = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (config.mcp_servers === undefined) config.mcp_servers = [];
  return config;
}

function validate(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('rig: config must be an object');
  if (config.hosts !== undefined) {
    if (!Array.isArray(config.hosts)) throw new Error('rig: hosts must be an array');
    for (const host of config.hosts) {
      if (!SUPPORTED_HOSTS.includes(host)) throw new Error(`rig: unknown host "${host}"`);
    }
  }
  if (!Array.isArray(config.mcp_servers)) throw new Error('rig: mcp_servers must be an array');

  for (const server of config.mcp_servers) {
    if (!server || typeof server !== 'object') throw new Error('rig: mcp server must be an object');
    if (typeof server.name !== 'string' || !server.name) throw new Error('rig: server name is required');
    if (!Array.isArray(server.variants) || server.variants.length === 0) throw new Error(`rig: server "${server.name}" needs variants`);
    for (const variant of server.variants) validateVariant(server.name, variant);
  }
}

function validateVariant(serverName, variant) {
  if (!variant || typeof variant !== 'object') throw new Error(`rig: variant in "${serverName}" must be an object`);
  if (typeof variant.id !== 'string' || !variant.id) throw new Error(`rig: variant in "${serverName}" needs an id`);
  if (!TRANSPORTS.includes(variant.transport)) throw new Error(`rig: variant "${variant.id}" transport must be stdio or http`);
  if (!CREDENTIAL_SAFETY.includes(variant.credential_safety)) {
    throw new Error(`rig: credential_safety must be config_only_safe or manual_note_required`);
  }
  if (variant.transport === 'stdio') {
    if (typeof variant.command !== 'string' || !Array.isArray(variant.args)) throw new Error(`rig: stdio variant "${variant.id}" needs command and args`);
  } else if (typeof variant.url !== 'string' || !variant.url) {
    throw new Error(`rig: http variant "${variant.id}" needs url`);
  }
  if (!Array.isArray(variant.credentials)) throw new Error(`rig: variant "${variant.id}" needs credentials array`);
  for (const credential of variant.credentials) {
    if (typeof credential !== 'string' || !NAME_ONLY.test(credential) || VALUE_SHAPED.test(credential)) {
      throw new Error(`rig: credentials must be env-var names only`);
    }
  }
}

module.exports = { TRANSPORTS, CREDENTIAL_SAFETY, SUPPORTED_HOSTS, loadUserConfig, validate };
