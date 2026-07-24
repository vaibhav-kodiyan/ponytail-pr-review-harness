const fs = require('node:fs');
const path = require('node:path');
const { SUPPORTED_HOSTS } = require('./config');
const { assignVariants } = require('./variants');
const { readReceipt } = require('./receipt');

const HOST_TIER = Object.fromEntries(SUPPORTED_HOSTS.map((host) => [host, 'B']));
Object.assign(HOST_TIER, {
  claude: 'A',
  codex: 'A',
  cursor: 'A',
  copilot: 'A',
  opencode: 'A',
  pi: 'A',
  gemini: 'A',
  kiro: 'A',
  devin: 'A',
  openclaw: 'A',
  codewhale: 'A',
  swival: 'A',
  'vscode-codex': 'A',
  generic: 'C',
});

const CREDENTIAL_SAFETY = {};
for (const host of Object.keys(HOST_TIER).filter((host) => HOST_TIER[host] === 'A')) {
  CREDENTIAL_SAFETY[`${host}:stdio`] = 'manual_note_required';
  CREDENTIAL_SAFETY[`${host}:http`] = 'manual_note_required';
}
CREDENTIAL_SAFETY['cursor:stdio'] = 'config_only_safe';
CREDENTIAL_SAFETY['copilot:stdio'] = 'config_only_safe';
CREDENTIAL_SAFETY['copilot:http'] = 'config_only_safe';

const HOST_FILES = {
  claude: '.mcp.json',
  cursor: '.cursor/mcp.json',
  codex: '.codex/config.toml',
  copilot: '.vscode/mcp.json',
  opencode: 'opencode.json',
  pi: '.omp/mcp.json',
  gemini: '.gemini/settings.json',
  kiro: '.kiro/settings/mcp.json',
  devin: '.devin/config.json',
  openclaw: '.openclaw/openclaw.json',
  codewhale: '.codewhale/mcp.json',
  swival: '.swival/mcp.json',
  'vscode-codex': '.codex/config.toml',
};

function mergeJson(filePath, mutate) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let obj = {};
  if (fs.existsSync(filePath)) {
    try {
      obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      obj = {};
    }
  }
  mutate(obj);
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n');
}

function appendTomlBlock(filePath, header, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (existing.split('\n').includes(`[${header}]`)) return;
  const sep = existing && !existing.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(filePath, `${existing}${sep}\n[${header}]\n${body}`);
}

const ref = (fmt, name) => fmt.replace('%s', name);
const envMap = (fmt, variant) => Object.fromEntries(variant.credentials.map((name) => [name, ref(fmt, name)]));
const authHeader = (fmt, variant) => ({ Authorization: `Bearer ${ref(fmt, variant.credentials[0])}` });
const jsonFile = (target, rel, mutate) => mergeJson(path.join(target, rel), mutate);

function genericEntry(variant, tokenFmt = '${%s}') {
  if (variant.transport === 'http') return { type: 'http', url: variant.url, headers: authHeader(tokenFmt, variant) };
  return { command: variant.command, args: variant.args, env: envMap(tokenFmt, variant) };
}

function renderClaude(target, server, variant) {
  const file = HOST_FILES.claude;
  jsonFile(target, file, (obj) => { (obj.mcpServers ??= {})[server.name] = genericEntry(variant, '${%s}'); });
  return { file, serverName: server.name };
}

function renderCursor(target, server, variant) {
  const file = HOST_FILES.cursor;
  const entry = genericEntry(variant, '${env:%s}');
  if (variant.transport === 'stdio') entry.envFile = '${workspaceFolder}/.env';
  jsonFile(target, file, (obj) => { (obj.mcpServers ??= {})[server.name] = entry; });
  return { file, serverName: server.name };
}

function renderCodex(target, server, variant) {
  const file = HOST_FILES.codex;
  const body = variant.transport === 'http'
    ? `url = "${variant.url}"\nbearer_token_env_var = "${variant.credentials[0]}"\n`
    : `command = "${variant.command}"\nargs = [${variant.args.map((arg) => JSON.stringify(arg)).join(', ')}]\nenv_vars = [${variant.credentials.map((name) => JSON.stringify(name)).join(', ')}]\n`;
  appendTomlBlock(path.join(target, file), `mcp_servers.${server.name}`, body);
  return { file, serverName: server.name };
}

function renderCopilot(target, server, variant) {
  const file = HOST_FILES.copilot;
  const inputs = variant.credentials.map((name) => ({ id: name, type: 'promptString', password: true }));
  const entry = variant.transport === 'http'
    ? { type: 'http', url: variant.url, headers: authHeader('${input:%s}', variant) }
    : { command: variant.command, args: variant.args, env: envMap('${input:%s}', variant), envFile: '${workspaceFolder}/.env' };
  jsonFile(target, file, (obj) => {
    obj.inputs = mergeById(obj.inputs || [], inputs);
    (obj.servers ??= {})[server.name] = entry;
  });
  return { file, serverName: server.name };
}

function renderOpencode(target, server, variant) {
  const file = HOST_FILES.opencode;
  const entry = variant.transport === 'http'
    ? { type: 'remote', url: variant.url, headers: authHeader('{env:%s}', variant) }
    : { type: 'local', command: variant.command, args: variant.args, environment: envMap('{env:%s}', variant) };
  jsonFile(target, file, (obj) => { (obj.mcp ??= {})[server.name] = entry; });
  return { file, serverName: server.name };
}

function renderPi(target, server, variant) {
  const file = HOST_FILES.pi;
  jsonFile(target, file, (obj) => { (obj.mcpServers ??= {})[server.name] = genericEntry(variant, '${%s}'); });
  return { file, serverName: server.name };
}

function renderGemini(target, server, variant) {
  const file = HOST_FILES.gemini;
  const entry = variant.transport === 'http'
    ? { httpUrl: variant.url, headers: authHeader('${%s}', variant) }
    : { command: variant.command, args: variant.args, env: envMap('${%s}', variant) };
  jsonFile(target, file, (obj) => { (obj.mcpServers ??= {})[server.name] = entry; });
  return { file, serverName: server.name };
}

function renderKiro(target, server, variant) {
  const file = HOST_FILES.kiro;
  const entry = variant.transport === 'http'
    ? { type: 'remote', url: variant.url, headers: authHeader('${%s}', variant) }
    : { type: 'local', command: variant.command, args: variant.args, env: envMap('${%s}', variant) };
  jsonFile(target, file, (obj) => { (obj.mcpServers ??= {})[server.name] = entry; });
  return { file, serverName: server.name };
}

function renderDevin(target, server, variant) {
  const file = HOST_FILES.devin;
  const entry = variant.transport === 'http'
    ? { transport: 'http', url: variant.url, headers: authHeader('${env:%s}', variant) }
    : genericEntry(variant, '${env:%s}');
  jsonFile(target, file, (obj) => { (obj.mcpServers ??= {})[server.name] = entry; });
  return { file, serverName: server.name };
}

function renderOpenclaw(target, server, variant) {
  const file = HOST_FILES.openclaw;
  const entry = variant.transport === 'http'
    ? { transport: 'streamable-http', url: variant.url, headers: authHeader('${%s}', variant) }
    : genericEntry(variant, '${%s}');
  jsonFile(target, file, (obj) => {
    ((obj.mcp ??= {}).servers ??= {})[server.name] = entry;
  });
  return { file, serverName: server.name };
}

function renderCodewhale(target, server, variant) {
  const file = HOST_FILES.codewhale;
  const entry = variant.transport === 'http'
    ? { url: variant.url, bearer_token_env_var: variant.credentials[0] }
    : { command: variant.command, args: variant.args, env: envMap('${%s}', variant) };
  jsonFile(target, file, (obj) => { (obj.mcpServers ??= {})[server.name] = entry; });
  return { file, serverName: server.name };
}

function renderSwival(target, server, variant) {
  const file = HOST_FILES.swival;
  const entry = variant.transport === 'http' ? { url: variant.url } : { command: variant.command, args: variant.args };
  jsonFile(target, file, (obj) => { (obj.mcpServers ??= {})[server.name] = entry; });
  return { file, serverName: server.name };
}

const RENDERERS = {
  claude: renderClaude,
  cursor: renderCursor,
  codex: renderCodex,
  copilot: renderCopilot,
  opencode: renderOpencode,
  pi: renderPi,
  gemini: renderGemini,
  kiro: renderKiro,
  devin: renderDevin,
  openclaw: renderOpenclaw,
  codewhale: renderCodewhale,
  swival: renderSwival,
  'vscode-codex': renderCodex,
};

function renderMcp(target, config) {
  const previous = readReceipt(target) || {};
  const receipt = {
    ownedFiles: [...new Set(previous.ownedFiles || [])],
    mergedEntries: [],
    noteHosts: [],
    credentialNames: [],
    tierC: [],
    chainedBackup: Boolean(previous.chainedBackup),
  };
  const hosts = config.hosts && config.hosts.length ? config.hosts : SUPPORTED_HOSTS;
  const tierA = hosts.filter((host) => HOST_TIER[host] === 'A' && RENDERERS[host]);
  const credentialNames = new Set();

  for (const server of config.mcp_servers) {
    const assigned = assignVariants(server, tierA);
    for (const [host, variant] of Object.entries(assigned)) {
      const file = fileFor(host);
      const existed = fs.existsSync(path.join(target, file));
      const rendered = RENDERERS[host](target, server, variant);
      if (!existed || receipt.ownedFiles.includes(rendered.file)) recordOwned(receipt, rendered.file);
      else receipt.mergedEntries.push({ file: rendered.file, serverName: rendered.serverName });
      if (CREDENTIAL_SAFETY[`${host}:${variant.transport}`] === 'manual_note_required') record(receipt.noteHosts, host);
      for (const name of variant.credentials) credentialNames.add(name);
    }
  }
  for (const host of hosts) {
    if (HOST_TIER[host] === 'B') record(receipt.noteHosts, host);
    if (HOST_TIER[host] === 'C') record(receipt.tierC, host);
  }
  receipt.credentialNames = [...credentialNames].sort();
  receipt.mergedEntries.sort((a, b) => `${a.file}:${a.serverName}`.localeCompare(`${b.file}:${b.serverName}`));
  receipt.noteHosts.sort();
  receipt.tierC.sort();
  receipt.ownedFiles.sort();
  return receipt;
}

function fileFor(host) {
  return HOST_FILES[host];
}

function mergeById(existing, additions) {
  const byId = Object.fromEntries(existing.map((item) => [item.id, item]));
  for (const item of additions) byId[item.id] = item;
  return Object.values(byId);
}

function record(list, value) {
  if (!list.includes(value)) list.push(value);
}

function recordOwned(receipt, file) {
  record(receipt.ownedFiles, file);
}

module.exports = { HOST_TIER, CREDENTIAL_SAFETY, mergeJson, appendTomlBlock, renderMcp, RENDERERS, fileFor };
