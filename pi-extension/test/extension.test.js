import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import rigExtension from "../index.js";

function createPiHarness() {
  const events = new Map();
  const commands = new Map();
  const appendedEntries = [];
  const sentUserMessages = [];

  const pi = {
    on(eventName, handler) {
      events.set(eventName, handler);
    },
    registerCommand(name, options) {
      commands.set(name, options);
    },
    appendEntry(customType, data) {
      appendedEntries.push({ customType, data });
    },
    sendUserMessage(text, options) {
      sentUserMessages.push({ text, options });
    },
  };

  rigExtension(pi);
  return { events, commands, appendedEntries, sentUserMessages };
}

function createCommandContext(overrides = {}) {
  return {
    isIdle: () => true,
    sessionManager: { getEntries: () => [] },
    ui: { notify() {} },
    ...overrides,
  };
}

function withTempConfig(fn) {
  const tempConfigHome = mkdtempSync(join(tmpdir(), "rig-test-"));
  const previousXdg = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tempConfigHome;

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (previousXdg === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = previousXdg;
      rmSync(tempConfigHome, { recursive: true, force: true });
    });
}

test("extension registers Rig commands", () => {
  const { commands } = createPiHarness();

  assert.deepEqual([...commands.keys()].sort(), ["rig", "rig-audit", "rig-debt", "rig-gain", "rig-help", "rig-review"]);
});

test("/rig updates session mode and injects instructions", async () => withTempConfig(async () => {
  const { commands, events, appendedEntries } = createPiHarness();
  const ctx = createCommandContext();

  await events.get("session_start")({ reason: "startup" }, ctx);
  await commands.get("rig").handler("ultra", ctx);

  assert.deepEqual(appendedEntries.at(-1), {
    customType: "rig-mode",
    data: { mode: "ultra" },
  });

  const result = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);
  assert.ok(result.systemPrompt.includes("RIG MODE ACTIVE"));
  assert.ok(result.systemPrompt.includes("ultra"));
}));

test("session_start restores latest persisted mode", async () => withTempConfig(async () => {
  const { events } = createPiHarness();
  const ctx = createCommandContext({
    sessionManager: {
      getEntries: () => [
        { type: "custom", customType: "rig-mode", data: { mode: "lite" } },
      ],
    },
  });

  await events.get("session_start")({ reason: "resume" }, ctx);
  const result = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);

  assert.ok(result.systemPrompt.includes("lite"));
}));

test("skill alias commands delegate to Pi skill commands", async () => {
  const { commands, sentUserMessages } = createPiHarness();
  const ctx = createCommandContext();

  await commands.get("rig-review").handler("", ctx);
  await commands.get("rig-audit").handler("", ctx);
  await commands.get("rig-debt").handler("", ctx);
  await commands.get("rig-gain").handler("", ctx);
  await commands.get("rig-help").handler("", ctx);

  assert.deepEqual(sentUserMessages.map((entry) => entry.text), [
    "/skill:rig-review",
    "/skill:rig-audit",
    "/skill:rig-debt",
    "/skill:rig-gain",
    "/skill:rig-help",
  ]);
});

test("normal mode disables persistent instructions", async () => withTempConfig(async () => {
  const { commands, events } = createPiHarness();
  const ctx = createCommandContext();

  await events.get("session_start")({ reason: "startup" }, ctx);
  await commands.get("rig").handler("ultra", ctx);
  await events.get("input")({ text: "normal mode", source: "interactive" }, ctx);

  const disabled = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);
  assert.equal(disabled, undefined);
}));

test("a request mentioning normal mode stays active", async () => withTempConfig(async () => {
  const { commands, events } = createPiHarness();
  const ctx = createCommandContext();

  await events.get("session_start")({ reason: "startup" }, ctx);
  await commands.get("rig").handler("ultra", ctx);
  await events.get("input")({ text: "add a normal mode toggle next to dark mode", source: "interactive" }, ctx);

  const result = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);
  assert.match(result.systemPrompt, /RIG MODE ACTIVE/);
}));

test("status bar renders the mode and flips active on agent_start", async () => withTempConfig(async () => {
  const { events } = createPiHarness();
  const statusWrites = [];
  const ctx = createCommandContext({
    sessionManager: { getEntries: () => [{ type: "custom", customType: "rig-mode", data: { mode: "ultra" } }] },
    ui: { notify() {}, setStatus: (key, text) => statusWrites.push({ key, text }), theme: { fg: (_color, text) => text } },
  });

  await events.get("session_start")({ reason: "resume" }, ctx);
  await events.get("agent_start")({}, ctx);

  assert.equal(statusWrites.at(-2).key, "rig");
  assert.match(statusWrites.at(-2).text, /○.*ULTRA/);
  assert.match(statusWrites.at(-1).text, /●.*ULTRA/);
}));

test("status bar stays silent when ui lacks a theme", async () => withTempConfig(async () => {
  const { events } = createPiHarness();
  const calls = [];
  const ctx = createCommandContext({
    sessionManager: { getEntries: () => [{ type: "custom", customType: "rig-mode", data: { mode: "ultra" } }] },
    ui: { notify() {}, setStatus: (_key, text) => calls.push(text) }, // setStatus present, theme absent
  });

  await events.get("session_start")({ reason: "resume" }, ctx);
  await events.get("agent_start")({}, ctx);

  assert.deepEqual(calls, []);
}));
