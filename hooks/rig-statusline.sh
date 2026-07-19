#!/usr/bin/env bash
# CLAUDE_CONFIG_DIR overrides ~/.claude, matching where the hooks write the flag (issue #34)
flag="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.rig-active"
[ -f "$flag" ] || exit 0

mode=$(head -n1 "$flag" | tr -d '[:space:]')

if [ -z "$mode" ] || [ "$mode" = "full" ]; then
    printf '\033[38;5;108m[RIG]\033[0m'
else
    printf '\033[38;5;108m[RIG:%s]\033[0m' "$(printf '%s' "$mode" | tr '[:lower:]' '[:upper:]')"
fi
