const SUPPORTED_TRANSPORTS = {
  claude: ['stdio', 'http'],
  codex: ['stdio', 'http'],
  cursor: ['stdio', 'http'],
  copilot: ['stdio', 'http'],
  opencode: ['stdio', 'http'],
  pi: ['stdio', 'http'],
  gemini: ['stdio', 'http'],
  kiro: ['stdio', 'http'],
  devin: ['stdio', 'http'],
  openclaw: ['stdio', 'http'],
  codewhale: ['stdio', 'http'],
  swival: ['stdio', 'http'],
  'vscode-codex': ['stdio', 'http'],
};

function representable(host, variant, support = SUPPORTED_TRANSPORTS) {
  return (support[host] || []).includes(variant.transport);
}

function assignVariants(server, hosts, support = SUPPORTED_TRANSPORTS) {
  const remaining = new Set(hosts);
  const assigned = {};
  const variants = [...server.variants].sort((a, b) => a.id.localeCompare(b.id));

  while (remaining.size) {
    let best = null;
    let bestHosts = [];
    for (const variant of variants) {
      const covered = [...remaining].filter((host) => representable(host, variant, support));
      if (covered.length > bestHosts.length) {
        best = variant;
        bestHosts = covered;
      }
    }
    if (!bestHosts.length) {
      throw new Error(`rig: server "${server.name}" has no compatible transport for ${[...remaining].join(', ')}`);
    }
    for (const host of bestHosts) {
      assigned[host] = best;
      remaining.delete(host);
    }
  }
  return assigned;
}

module.exports = { SUPPORTED_TRANSPORTS, representable, assignVariants };
