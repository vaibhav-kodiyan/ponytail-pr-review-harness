#!/usr/bin/env sh
# Install Rig Tier 1's fixed markdown payload into a repository.
set -eu

SOURCE_ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
TARGET_ROOT=$(pwd)
TIER=
HOSTS=${RIG_HOSTS:-}

usage() {
  echo "usage: sh rig/bootstrap.sh [--tier 1] [--target REPOSITORY] [--hosts host1,host2]" >&2
  echo "  Hosts may also be set via RIG_HOSTS (comma-separated). When set, install" >&2
  echo "  delegates to rig/lib/payload.js and requires 'node' on PATH." >&2
  exit 2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --tier)
      [ "$#" -ge 2 ] || usage
      TIER=$2
      shift 2
      ;;
    --target)
      [ "$#" -ge 2 ] || usage
      TARGET_ROOT=$2
      shift 2
      ;;
    --hosts)
      [ "$#" -ge 2 ] || usage
      HOSTS=$2
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      usage
      ;;
  esac
done

if [ -z "$TIER" ] && [ -t 0 ]; then
  printf 'Select Rig tier [1]: '
  read -r TIER
fi
TIER=${TIER:-1}
[ "$TIER" = 1 ] || { echo "rig: only Tier 1 is available" >&2; exit 1; }
[ -d "$TARGET_ROOT" ] || { echo "rig: target is not a directory: $TARGET_ROOT" >&2; exit 1; }
TARGET_ROOT=$(CDPATH= cd -- "$TARGET_ROOT" && pwd)
[ "$SOURCE_ROOT" != "$TARGET_ROOT" ] || { echo "rig: target must differ from the Rig checkout: $SOURCE_ROOT" >&2; exit 1; }

# Host selection composes the payload the same way as the Tier 2 materializer.
if [ -n "$HOSTS" ]; then
  command -v node >/dev/null 2>&1 || {
    echo "rig: --hosts / RIG_HOSTS needs 'node' on PATH. Install Node.js, or omit --hosts to run the full POSIX-sh install." >&2
    exit 1
  }
  echo "Installing Rig Tier 1 into $TARGET_ROOT (hosts: $HOSTS)"
  HOSTS="$HOSTS" TARGET_ROOT="$TARGET_ROOT" SOURCE_ROOT="$SOURCE_ROOT" node <<'EOF'
const { runPayload } = require(require('node:path').join(process.env.SOURCE_ROOT, 'rig', 'lib', 'payload'));
const hosts = process.env.HOSTS.split(',').map((h) => h.trim()).filter(Boolean);
runPayload(process.env.TARGET_ROOT, hosts);
for (const host of hosts) console.log('  host:', host);
EOF
  echo "Rig Tier 1 installed for selected hosts via payload.js."
  exit 0
fi

install_markdown() {
  source=$1
  target=$2
  mkdir -p "$(dirname "$TARGET_ROOT/$target")"
  cp "$SOURCE_ROOT/$source" "$TARGET_ROOT/$target"
  printf '  %s\n' "$target"
}

ensure_line() {
  target=$1
  line=$2
  file=$TARGET_ROOT/$target
  mkdir -p "$(dirname "$file")"
  touch "$file"
  grep -Fqx "$line" "$file" || printf '\n%s\n' "$line" >> "$file"
  printf '  %s\n' "$target"
}

echo "Installing Rig Tier 1 into $TARGET_ROOT"

# rig: an explicit list is the Tier 1 proto-manifest; replace it with the
# Tier 2 materializer only when another tier needs composition or drift checks.
install_markdown rig/tier-1/routing.md .rig/routing.md
install_markdown rig/tier-1/rules/rig.md .rig/rules/rig.md
install_markdown rig/tier-1/skills/grilling/SKILL.md .rig/skills/grilling/SKILL.md
install_markdown rig/tier-1/skills/product-design/SKILL.md .rig/skills/product-design/SKILL.md
install_markdown skills/rig/SKILL.md .rig/skills/implementation/SKILL.md
install_markdown rig/tier-1/skills/execution/SKILL.md .rig/skills/execution/SKILL.md
install_markdown rig/tier-1/skills/tdd/SKILL.md .rig/skills/tdd/SKILL.md
install_markdown rig/tier-1/skills/debugging/SKILL.md .rig/skills/debugging/SKILL.md
install_markdown rig/tier-1/skills/code-review/SKILL.md .rig/skills/code-review/SKILL.md

install_markdown .claude/skills/rig-grilling/SKILL.md .claude/skills/rig-grilling/SKILL.md
install_markdown .claude/skills/rig-product-design/SKILL.md .claude/skills/rig-product-design/SKILL.md
install_markdown .claude/skills/rig-implementation/SKILL.md .claude/skills/rig-implementation/SKILL.md
install_markdown .claude/skills/rig-execution/SKILL.md .claude/skills/rig-execution/SKILL.md
install_markdown .claude/skills/rig-tdd/SKILL.md .claude/skills/rig-tdd/SKILL.md
install_markdown .claude/skills/rig-debugging/SKILL.md .claude/skills/rig-debugging/SKILL.md
install_markdown .claude/skills/rig-code-review/SKILL.md .claude/skills/rig-code-review/SKILL.md

install_markdown .agents/skills/rig-grilling/SKILL.md .agents/skills/rig-grilling/SKILL.md
install_markdown .agents/skills/rig-product-design/SKILL.md .agents/skills/rig-product-design/SKILL.md
install_markdown .agents/skills/rig-implementation/SKILL.md .agents/skills/rig-implementation/SKILL.md
install_markdown .agents/skills/rig-execution/SKILL.md .agents/skills/rig-execution/SKILL.md
install_markdown .agents/skills/rig-tdd/SKILL.md .agents/skills/rig-tdd/SKILL.md
install_markdown .agents/skills/rig-debugging/SKILL.md .agents/skills/rig-debugging/SKILL.md
install_markdown .agents/skills/rig-code-review/SKILL.md .agents/skills/rig-code-review/SKILL.md

install_markdown .agents/workflows/rig.md .agents/workflows/rig.md
install_markdown .agents/workflows/rig-review.md .agents/workflows/rig-review.md
install_markdown .agents/workflows/rig-audit.md .agents/workflows/rig-audit.md
install_markdown .agents/workflows/rig-debt.md .agents/workflows/rig-debt.md
install_markdown .agents/workflows/rig-gain.md .agents/workflows/rig-gain.md
install_markdown .agents/workflows/rig-help.md .agents/workflows/rig-help.md

ensure_line CLAUDE.md 'Before acting, read `.rig/routing.md` and route this task through its skill table.'
install_markdown rig/tier-1/adapters/cursor.mdc .cursor/rules/rig.mdc
install_markdown rig/tier-1/adapters/windsurf.md .windsurf/rules/rig.md
install_markdown rig/tier-1/adapters/cline.md .clinerules/rig.md
install_markdown rig/tier-1/adapters/pointer.md .agents/rules/rig.md
install_markdown rig/tier-1/adapters/kiro.md .kiro/steering/rig.md
ensure_line AGENTS.md 'Before acting, read `.rig/routing.md` and route this task through its skill table.'
ensure_line GEMINI.md 'Before acting, read `.rig/routing.md` and route this task through its skill table.'
ensure_line .github/copilot-instructions.md 'Before acting, read `.rig/routing.md` and route this task through its skill table.'

echo "Rig Tier 1 installed: shared router, 7 native Claude/Codex skills, Antigravity workflows, and instruction adapters."
