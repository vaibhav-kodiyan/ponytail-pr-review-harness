#!/usr/bin/env sh
# Install Rig Tier 1's fixed markdown payload into a repository.
set -eu

SOURCE_ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
TARGET_ROOT=$(pwd)
TIER=

usage() {
  echo "usage: sh rig/bootstrap.sh [--tier 1] [--target REPOSITORY]" >&2
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

# ponytail: an explicit list is the Tier 1 proto-manifest; replace it with the
# Tier 2 materializer only when another tier needs composition or drift checks.
install_markdown rig/tier-1/routing.md .rig/routing.md
install_markdown rig/tier-1/rules/ponytail.md .rig/rules/ponytail.md
install_markdown rig/tier-1/skills/grilling/SKILL.md .rig/skills/grilling/SKILL.md
install_markdown rig/tier-1/skills/product-design/SKILL.md .rig/skills/product-design/SKILL.md
install_markdown skills/ponytail/SKILL.md .rig/skills/ponytail/SKILL.md
install_markdown rig/tier-1/skills/execution/SKILL.md .rig/skills/execution/SKILL.md
install_markdown rig/tier-1/skills/tdd/SKILL.md .rig/skills/tdd/SKILL.md
install_markdown rig/tier-1/skills/debugging/SKILL.md .rig/skills/debugging/SKILL.md
install_markdown rig/tier-1/skills/code-review/SKILL.md .rig/skills/code-review/SKILL.md

install_markdown .claude/skills/rig-grilling/SKILL.md .claude/skills/rig-grilling/SKILL.md
install_markdown .claude/skills/rig-product-design/SKILL.md .claude/skills/rig-product-design/SKILL.md
install_markdown .claude/skills/rig-ponytail/SKILL.md .claude/skills/rig-ponytail/SKILL.md
install_markdown .claude/skills/rig-execution/SKILL.md .claude/skills/rig-execution/SKILL.md
install_markdown .claude/skills/rig-tdd/SKILL.md .claude/skills/rig-tdd/SKILL.md
install_markdown .claude/skills/rig-debugging/SKILL.md .claude/skills/rig-debugging/SKILL.md
install_markdown .claude/skills/rig-code-review/SKILL.md .claude/skills/rig-code-review/SKILL.md

install_markdown .agents/skills/rig-grilling/SKILL.md .agents/skills/rig-grilling/SKILL.md
install_markdown .agents/skills/rig-product-design/SKILL.md .agents/skills/rig-product-design/SKILL.md
install_markdown .agents/skills/rig-ponytail/SKILL.md .agents/skills/rig-ponytail/SKILL.md
install_markdown .agents/skills/rig-execution/SKILL.md .agents/skills/rig-execution/SKILL.md
install_markdown .agents/skills/rig-tdd/SKILL.md .agents/skills/rig-tdd/SKILL.md
install_markdown .agents/skills/rig-debugging/SKILL.md .agents/skills/rig-debugging/SKILL.md
install_markdown .agents/skills/rig-code-review/SKILL.md .agents/skills/rig-code-review/SKILL.md

ensure_line CLAUDE.md 'Before acting, read `.rig/routing.md` and route this task through its skill table.'
install_markdown rig/tier-1/adapters/cursor.mdc .cursor/rules/rig.mdc
install_markdown rig/tier-1/adapters/pointer.md .windsurf/rules/rig.md
install_markdown rig/tier-1/adapters/pointer.md .clinerules/rig.md
install_markdown rig/tier-1/adapters/pointer.md .agents/rules/rig.md
install_markdown rig/tier-1/adapters/kiro.md .kiro/steering/rig.md
ensure_line AGENTS.md 'Before acting, read `.rig/routing.md` and route this task through its skill table.'
ensure_line GEMINI.md 'Before acting, read `.rig/routing.md` and route this task through its skill table.'
ensure_line .github/copilot-instructions.md 'Before acting, read `.rig/routing.md` and route this task through its skill table.'

echo "Rig Tier 1 installed: shared router, 7 native Claude/Codex skills, and instruction adapters."
