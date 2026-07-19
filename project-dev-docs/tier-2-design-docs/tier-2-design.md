# Tier 2 — Design (in progress)

Exported 2026-07-16 from the grill session. Companion decisions log:
`../foundational-design/grill-decisions.md`. Source of truth for the overall product:
`../foundational-design/rig-foundational-design.md`. Tier 1 sibling:
`../tier-1-design-docs/tier-1-mvp-design.md`.

**Status:** partially grilled. The Basic/Advanced split is decided (G11); the load-bearing
fork inside Advanced (G11a) is still OPEN — see §5. **Tier 2 Basic is now finalized in
`basic/basic-design.md`** (which supersedes the Basic material in §2/§3 below); **Tier 2
Advanced** is not yet locked.

The harness is called **Rig** (G10a).

---

## 1. Where Tier 2 sits

Rig's install spectrum (à-la-carte, #2):

```
Tier 1  → markdown harnesses only (rules + skills + routing.md), no keys, no runtime
Tier 2  → wired agentic workflows, user keys via gitignored .env      ← THIS DOC
Tier 3  → the harness generator (Layer 2)
```

Tier 1 is pure text that steers the host agent. **Tier 2 is where state and credentials
enter** — which is precisely why it is a separate tier: anything that needs a key, a running
tool, or persistent memory cannot be Tier-1 markdown.

## 2. The Tier 2 split — Basic vs Advanced (G11)

Tier 2 is delivered as two sub-levels, not one jump:

### Tier 2 Basic — bounded delta (the "A" answer)
- = **Tier 1 config + wiring credentialed external tools / MCP servers.**
- `.env` holds **third-party tool credentials** (a DB, Slack, the ETL loop's data source, a
  scraping API). Installer generates `.env.example` with blank placeholders; keys stay local
  and are never committed (#7).
- **Rig still does not run an LLM.** It tells the host agent "here is an MCP server, here is the
  credential slot." #11 (the agent IS the generator; Rig emits config) stays fully intact.
- First recipe / dogfood target: the **ETL self-verify loop** (#11a) — a script the *host*
  agent authors and runs in the host shell (spin up local artifacts, health-check, curl with
  params, assert data, iterate on failure), wired by a verify recipe slot + a "run verify after
  a change, iterate on failure" hook.
- Small, buildable, coherent extension of Tier 1.

### Tier 2 Advanced — agents, loops, and memory (the "B" answer)
- Rig **spins up richer agentic workflows** (multi-step loops, dispatched agents).
- **"Grow and understand with the repo"** = persistent, **repo-scoped memory / learning** — the
  stateful capability deliberately dropped from Tier 1 in G4 (Rig's own equivalent of gstack's
  `~/.gstack` gbrain / `learnings.jsonl`). Because it is *state*, it belongs to Tier 2+, needs
  the `.env` / gitignore treatment, and cannot be pure-markdown Tier 1.
- **Key insight for scoping:** the thing that makes Rig "grow with the repo" is a **memory
  store**, not a brain. The host agent reads/writes that store each session — that alone yields
  "grows with the repo" without Rig running its own LLM.
- **The open fork (§5) decides how far Advanced goes** — whether the loops run on the host's
  brain or Rig's own.

## 3. Secrets (constraint, non-negotiable — #7)

- Any tier that takes keys uses a **gitignored `.env`**; the installer generates
  `.env.example` with blank placeholders and states keys stay local.
- Applies to both Basic (tool creds) and Advanced (tool creds + any memory/vector-store creds).
- No secret ever lands in git. Materialized adapter files can be gitignored (#1 clean target
  repos).

## 4. Relationship to the deferred spine

- The **manifest + materializer** land in Tier 2 (confirmed G3/G3a) — Tier 1 shipped a dumb,
  tidy, enumerable bootstrap specifically so Tier 2's materializer can describe the existing
  layout without a reshape. The fixed file list Tier 1 already needs is the proto-manifest.
- Tier 2 entries are where the **advisory vs enforcing** tag (#12) and the enforcing **hooks**
  (G6a) do most of their work — e.g. the two-gate pipeline (#13) PreToolUse guard, and the
  gstack-derived debug **freeze hook** from the debugging graft.

## 5. OPEN — G11a: whose brain runs Tier 2 Advanced's loops?

This fork decides whether Rig stays *config* or becomes a *runtime*, and whether #11 survives.

- **(B1) Host-brain loops.** Rig **authors** the loop config (subagent defs, "verify + iterate"
  hooks, the repo-scoped memory store); the **host agent runs them on the host's own LLM**. The
  `.env` keys are for tools + the memory store, **never a model**. **#11 survives**; Rig stays
  host-agnostic (rides whatever host is installed); aligns with G2 build-minimal.
- **(B2) Rig-brain loops.** Rig carries its **own LLM runtime + model API key** and runs loops
  independently of the host. A genuine engine to build/maintain (model choice, retries, cost,
  streaming); **contradicts #11** and undercuts host-agnosticism (needs its own model key on
  every install; competes with the host rather than steering it).

**Grill recommendation: B1.** The memory store (not a brain) is what makes Rig "grow with the
repo," so B1 already delivers the growth the user asked for while keeping Rig as config. Keep an
independent Rig-runtime (B2) an explicit **non-goal** unless a concrete need forces it — else
Rig becomes a second agent framework, the maximalism G2 warns against.

**Awaiting user decision: B1 or B2.**

## 6. Open items carried forward

- **G11a** (§5) — host-brain vs Rig-brain for Tier 2 Advanced. Blocks locking Advanced.
- Memory-store design (format, repo-scoping, portability across hosts) — grill after G11a.
- Tier 2 multi-host test strategy (extends the Tier-1 scripted temp-repo test to cover
  credentialed wiring without real secrets).
- Manifest schema (source Open #2) — its formal 6-point bar is a Tier 2 build input.
