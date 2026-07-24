#!/usr/bin/env node
// Build-owned coverage for TP-C4.1..11 in the Tier 2 Basic test plan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { materialize, exampleServer, valueShaped, walk, withRepo } = require('./helpers/basic-install');

const exists = (target, rel) => fs.existsSync(path.join(target, rel));
const read = (target, rel) => fs.readFileSync(path.join(target, rel), 'utf8');
const stdioOnly = { ...exampleServer, variants: [exampleServer.variants.find((v) => v.transport === 'stdio')] };
const httpOnly = { ...exampleServer, variants: [exampleServer.variants.find((v) => v.transport === 'http')] };

function materializeOne(target, host, server = stdioOnly) {
  materialize(target, { hosts: [host], mcp_servers: [server] });
}

function note(target) {
  return read(target, '.rig/mcp-setup.md');
}

function assertNoLiteralSecret(target) {
  for (const file of walk(target)) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), valueShaped, `${path.relative(target, file)} is value-free`);
  }
}

test('TP-C4.1 Cursor stdio emits envFile and no manual note', () => {
  withRepo((target) => {
    materializeOne(target, 'cursor', stdioOnly);

    const body = read(target, '.cursor/mcp.json');
    assert.match(body, /envFile/i, 'Cursor stdio uses envFile');
    assert.match(body, /\$\{workspaceFolder\}\/\.env/, 'Cursor envFile points at the repo .env');
    assert.doesNotMatch(note(target), /Cursor/i, 'Cursor stdio does not require a manual setup note');
    assertNoLiteralSecret(target);
  });
});

test('TP-C4.2 GitHub Copilot VS Code emits project mcp config with envFile and input references', () => {
  withRepo((target) => {
    materializeOne(target, 'copilot', stdioOnly);

    const body = read(target, '.vscode/mcp.json');
    assert.match(body, /envFile/i, 'VS Code config uses envFile');
    assert.match(body, /\$\{workspaceFolder\}\/\.env/, 'VS Code envFile points at the repo .env');
    assert.match(body, /\$\{input:/, 'VS Code config uses input references for credentials');
    assert.doesNotMatch(note(target), /GitHub Copilot/i, 'config_only_safe Copilot host gets no manual note');
    assertNoLiteralSecret(target);
  });
});

test('TP-C4.2b GitHub Copilot HTTP uses secure inputs without a manual load note', () => {
  withRepo((target) => {
    materializeOne(target, 'copilot', httpOnly);

    assert.match(read(target, '.vscode/mcp.json'), /\$\{input:/, 'VS Code HTTP config securely prompts for credentials');
    assert.doesNotMatch(note(target), /GitHub Copilot:/i, 'config_only_safe Copilot HTTP gets no manual note');
    assert.doesNotMatch(note(target), /source \.env/, 'Copilot HTTP gets no unnecessary .env load step');
    assertNoLiteralSecret(target);
  });
});

test('TP-C4.3 bucket-2 project renderers emit value-free config plus a manual note', () => {
  for (const [host, file, token] of [
    ['kiro', '.kiro/settings/mcp.json', /\$\{EXAMPLE_DB_TOKEN\}/],
    ['gemini', '.gemini/settings.json', /\$\{EXAMPLE_DB_TOKEN\}|\$EXAMPLE_DB_TOKEN/],
    ['opencode', 'opencode.json', /\{env:EXAMPLE_DB_TOKEN\}/],
    ['pi', '.omp/mcp.json', /\$\{EXAMPLE_DB_TOKEN\}/],
  ]) {
    withRepo((target) => {
      materializeOne(target, host, stdioOnly);
      assert.match(read(target, file), token, `${host} uses its documented name-only token`);
      assert.match(note(target), new RegExp(host, 'i'), `${host} has a manual setup note`);
      assertNoLiteralSecret(target);
    });
  }
});

test('TP-C4.4 Devin emits project config with value-free env references and a note', () => {
  withRepo((target) => {
    materializeOne(target, 'devin', stdioOnly);

    assert.match(read(target, '.devin/config.json'), /\$\{env:EXAMPLE_DB_TOKEN\}/, 'Devin uses ${env:VAR}');
    assert.match(note(target), /Devin/i, 'Devin has a manual setup note');
    assertNoLiteralSecret(target);
  });
});

test('TP-C4.4b Devin HTTP emits the documented transport field', () => {
  withRepo((target) => {
    materializeOne(target, 'devin', httpOnly);

    const entry = JSON.parse(read(target, '.devin/config.json')).mcpServers['example-db'];
    assert.equal(entry.transport, 'http');
    assert.equal(entry.type, undefined, 'Devin raw config does not use the generic type alias');
    assert.equal(entry.headers.Authorization, 'Bearer ${env:EXAMPLE_DB_TOKEN}');
  });
});

test('TP-C4.5 OpenClaw emits repo-local config and mandatory OPENCLAW_CONFIG_PATH note', () => {
  withRepo((target) => {
    materializeOne(target, 'openclaw', stdioOnly);

    assert.match(read(target, '.openclaw/openclaw.json'), /\$\{EXAMPLE_DB_TOKEN\}/, 'OpenClaw config is value-free');
    assert.match(note(target), /export OPENCLAW_CONFIG_PATH=\.\/\.openclaw\/openclaw\.json/, 'OpenClaw wiring export is documented');
    assertNoLiteralSecret(target);
  });
});

test('TP-C4.5b OpenClaw HTTP emits the canonical streamable transport field', () => {
  withRepo((target) => {
    materializeOne(target, 'openclaw', httpOnly);

    const entry = JSON.parse(read(target, '.openclaw/openclaw.json')).mcp.servers['example-db'];
    assert.equal(entry.transport, 'streamable-http');
    assert.equal(entry.type, undefined, 'OpenClaw raw config does not rely on a CLI-normalized alias');
    assert.equal(entry.headers.Authorization, 'Bearer ${EXAMPLE_DB_TOKEN}');
  });
});

test('TP-C4.6 CodeWhale emits repo-local config and mandatory DEEPSEEK_MCP_CONFIG note', () => {
  withRepo((target) => {
    materializeOne(target, 'codewhale', httpOnly);

    const entry = JSON.parse(read(target, '.codewhale/mcp.json')).mcpServers['example-db'];
    assert.equal(entry.bearer_token_env_var, 'EXAMPLE_DB_TOKEN', 'CodeWhale reads the bearer token from the named env var');
    assert.equal(entry.headers?.Authorization, undefined, 'CodeWhale does not shadow env-backed bearer auth with a static header');
    assert.match(note(target), /export DEEPSEEK_MCP_CONFIG=\.\/\.codewhale\/mcp\.json/, 'CodeWhale wiring export is documented');
    assertNoLiteralSecret(target);
  });
});

test('TP-C4.7 Swival emits project-local config without a credential slot plus a note', () => {
  withRepo((target) => {
    materializeOne(target, 'swival', stdioOnly);

    const body = exists(target, 'swival.toml') ? read(target, 'swival.toml') : read(target, '.swival/mcp.json');
    assert.match(body, /example-db/, 'Swival config includes the server');
    assert.doesNotMatch(body, /EXAMPLE_DB_TOKEN/, 'Swival config omits undocumented credential interpolation');
    assert.match(note(target), /Swival/i, 'Swival has a manual setup note');
    assertNoLiteralSecret(target);
  });
});

test('TP-C4.8 Tier-B note-only hosts emit no MCP config file', () => {
  for (const [host, forbidden] of [
    ['hermes', ['.hermes/config.yaml']],
    ['windsurf', ['.windsurf/mcp_config.json', '.codeium/mcp_config.json']],
    ['cline', ['.cline/mcp.json']],
    ['copilot-cli', ['.copilot/mcp-config.json']],
    ['antigravity', ['.agents/mcp_config.json', '.gemini/antigravity/mcp_config.json', '.gemini/config/mcp_config.json']],
  ]) {
    withRepo((target) => {
      materializeOne(target, host, stdioOnly);
      for (const rel of forbidden) assert.equal(exists(target, rel), false, `${host} does not emit ${rel}`);
      assert.match(note(target), new RegExp(host.replace('-', '.*'), 'i'), `${host} has a note-only setup block`);
      assertNoLiteralSecret(target);
    });
  }
});

test('TP-C4.9 Generic emits no renderer output and exactly one acknowledgment line', () => {
  withRepo((target) => {
    materializeOne(target, 'generic', stdioOnly);

    const setup = note(target);
    assert.equal((setup.match(/Generic/i) || []).length, 1, 'Generic has one acknowledgment line');
    assert.equal(walk(target).some((file) => /mcp\.json|config\.toml|settings\.json|openclaw\.json/.test(path.relative(target, file))), false);
  });
});

test('TP-C4.10 VS Code Codex extension reuses the Codex renderer target', () => {
  withRepo((target) => {
    materializeOne(target, 'vscode-codex', stdioOnly);

    assert.ok(exists(target, '.codex/config.toml'), 'VS Code Codex extension emits Codex config');
    assert.equal(exists(target, '.vscode/mcp.json'), false, 'no separate VS Code MCP config is emitted');
    assert.match(note(target), /Codex/i, 'Codex setup note is reused');
    assertNoLiteralSecret(target);
  });
});

test('TP-C4.11 credential_safety controls Cursor stdio vs http output', () => {
  withRepo((stdioTarget) => {
    materializeOne(stdioTarget, 'cursor', stdioOnly);
    assert.match(read(stdioTarget, '.cursor/mcp.json'), /envFile/i, 'stdio class uses config-only envFile');
    assert.doesNotMatch(note(stdioTarget), /Cursor/i, 'stdio class needs no manual note');
  });

  withRepo((httpTarget) => {
    materializeOne(httpTarget, 'cursor', httpOnly);
    assert.doesNotMatch(read(httpTarget, '.cursor/mcp.json'), /envFile/i, 'http class has no envFile loader');
    assert.match(note(httpTarget), /Cursor/i, 'http class requires a manual note');
  });
});
