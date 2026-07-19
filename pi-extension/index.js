import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_MODE,
  getDefaultMode,
  normalizeMode,
  normalizeConfigMode,
  normalizePersistedMode,
  isDeactivationCommand,
  writeDefaultMode,
} = require("../hooks/rig-config.js");
const { getRigInstructions, filterSkillBodyForMode } = require("../hooks/rig-instructions.js");

export { filterSkillBodyForMode };
export const readDefaultMode = getDefaultMode;

export function resolveSessionMode(entries, fallbackMode = DEFAULT_MODE) {
  const fallback = normalizePersistedMode(fallbackMode) || DEFAULT_MODE;
  if (!Array.isArray(entries)) return fallback;

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.type !== "custom" || entry?.customType !== "rig-mode") continue;

    const mode = normalizePersistedMode(entry?.data?.mode);
    if (mode) return mode;
  }

  return fallback;
}

export function parseRigCommand(text, defaultMode = DEFAULT_MODE) {
  const fallback = normalizePersistedMode(defaultMode) || DEFAULT_MODE;
  const normalizedText = String(text || "").trim().toLowerCase();

  if (!normalizedText) {
    return { type: "set-mode", mode: fallback === "off" ? "full" : fallback };
  }

  const [primary, secondary] = normalizedText.split(/\s+/);

  if (primary === "status") return { type: "status" };

  if (primary === "default") {
    const mode = normalizeConfigMode(secondary);
    return mode ? { type: "set-default", mode } : { type: "invalid", reason: "invalid-default-mode" };
  }

  const mode = normalizeMode(primary);
  return mode ? { type: "set-mode", mode } : { type: "invalid", reason: "invalid-mode", mode: primary };
}

export { writeDefaultMode };

export default function rigExtension(pi) {
  let currentMode = DEFAULT_MODE;
  let configuredDefaultMode = getDefaultMode();
  let isActive = false;
  let lastCtx = null;

  // -- Status bar --
  function syncStatus(ctx) {
    if (ctx) lastCtx = ctx;
    const c = ctx || lastCtx;
    if (!c?.ui?.setStatus || !c.ui.theme?.fg) return;
    const theme = c.ui.theme;
    if (currentMode === "off") {
      c.ui.setStatus("rig", "");
      return;
    }
    const levelIcons = { lite: "🌿", full: "⚡", ultra: "🔥" };
    const icon = levelIcons[currentMode] || "";
    const label = currentMode.toUpperCase();
    const indicator = isActive ? theme.fg("accent", "●") : theme.fg("dim", "○");
    c.ui.setStatus("rig", indicator + " 🐴 " + theme.fg("muted", "rig: ") + theme.fg("text", icon + " " + label));
  }

  const setMode = (mode, ctx) => {
    const normalized = normalizePersistedMode(mode);
    if (!normalized) return;

    currentMode = normalized;
    pi.appendEntry("rig-mode", { mode: normalized });
    syncStatus(ctx);
    ctx?.ui?.notify?.(`Rig mode set to ${normalized}.`, "info");
  };

  const sendAlias = (skillName, args, ctx) => {
    const normalized = String(args || "").trim();
    const message = normalized ? `${skillName} ${normalized}` : skillName;

    if (ctx?.isIdle?.() === false) {
      pi.sendUserMessage(message, { deliverAs: "followUp" });
      ctx?.ui?.notify?.(`${skillName} queued as follow-up.`, "info");
      return;
    }

    pi.sendUserMessage(message);
  };

  pi.registerCommand("rig", {
    description: "Set or report Rig mode",
    handler: async (args, ctx) => {
      const parsed = parseRigCommand(args, configuredDefaultMode);

      if (parsed.type === "status") {
        ctx?.ui?.notify?.(`Rig: current ${currentMode} • default ${configuredDefaultMode}`, "info");
        return;
      }

      if (parsed.type === "set-default") {
        const written = writeDefaultMode(parsed.mode);
        if (written) {
          configuredDefaultMode = getDefaultMode();
          const message = configuredDefaultMode === written
            ? `Default Rig mode set to ${written}.`
            : `Saved default ${written}, but env override keeps default at ${configuredDefaultMode}.`;
          ctx?.ui?.notify?.(message, "info");
        }
        return;
      }

      if (parsed.type === "set-mode") {
        setMode(parsed.mode, ctx);
        return;
      }

      ctx?.ui?.notify?.("Unknown or unsupported /rig mode.", "warning");
    },
  });

  pi.registerCommand("rig-review", {
    description: "Run /skill:rig-review",
    handler: (_args, ctx) => sendAlias("/skill:rig-review", "", ctx),
  });

  pi.registerCommand("rig-audit", {
    description: "Run /skill:rig-audit",
    handler: (_args, ctx) => sendAlias("/skill:rig-audit", "", ctx),
  });

  pi.registerCommand("rig-gain", {
    description: "Run /skill:rig-gain",
    handler: (_args, ctx) => sendAlias("/skill:rig-gain", "", ctx),
  });

  pi.registerCommand("rig-debt", {
    description: "Run /skill:rig-debt",
    handler: (_args, ctx) => sendAlias("/skill:rig-debt", "", ctx),
  });

  pi.registerCommand("rig-help", {
    description: "Run /skill:rig-help",
    handler: (_args, ctx) => sendAlias("/skill:rig-help", "", ctx),
  });

  pi.on("input", async (event) => {
    if (event?.source === "extension") return;

    const text = String(event?.text || "");
    if (currentMode !== "off" && isDeactivationCommand(text)) {
      setMode("off");
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx?.sessionManager?.getBranch?.() || ctx?.sessionManager?.getEntries?.() || [];
    configuredDefaultMode = getDefaultMode();
    currentMode = resolveSessionMode(entries, configuredDefaultMode);
    syncStatus(ctx);
    ctx?.ui?.notify?.(`Rig loaded: ${currentMode}`, "info");
  });

  pi.on("agent_start", async (_event, ctx) => {
    isActive = true;
    syncStatus(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    isActive = false;
    syncStatus(ctx);
  });

  pi.on("before_agent_start", async (event) => {
    if (!currentMode || currentMode === "off") return;
    return { systemPrompt: `${event.systemPrompt}\n\n${getRigInstructions(currentMode)}` };
  });
}
