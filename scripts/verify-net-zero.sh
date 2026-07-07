#!/usr/bin/env bash
# Gate: assert the review left the repo exactly as it found it, plus one new
# report. Source-agnostic — reads $REPORT from pr-meta.env, never branches on
# SOURCE=pr|branch. Exit non-zero on the first violation found.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

META="$ROOT/.pr-review/pr-meta.env"
if [ ! -f "$META" ]; then
  echo "verify-net-zero: missing .pr-review/pr-meta.env — run pr-context.sh first" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$META"
: "${HEAD_SHA:?HEAD_SHA not set in pr-meta.env}"
: "${REPORT:?REPORT not set in pr-meta.env}"

fail() {
  echo "verify-net-zero: $1" >&2
  exit 1
}

# The review worktree's HEAD must be exactly what pr-context.sh built it at —
# catches a commit/amend/reset happening inside the isolated review checkout.
WORKTREE="$ROOT/.pr-review/worktree"
if [ -d "$WORKTREE" ]; then
  WT_HEAD="$(git -C "$WORKTREE" rev-parse HEAD)"
  [ "$WT_HEAD" = "$HEAD_SHA" ] || fail "worktree HEAD moved: expected $HEAD_SHA, found $WT_HEAD"
  [ -z "$(git -C "$WORKTREE" status --porcelain)" ] || fail "worktree has uncommitted changes"
fi

# Stash is repository-wide (shared across worktrees), so one check covers both.
[ -z "$(git stash list)" ] || fail "a stash was created during review"

REPORT_PATH="docs/pr-reviews/${REPORT}"
[ -f "$REPORT_PATH" ] || fail "report missing: $REPORT_PATH"

# Everything else in the main tree (untracked, modified, or staged) must be
# clean except the one report this review produced. .pr-review/ itself is the
# harness's own control dir, still present at this point (finalize-review.sh
# removes it after this gate passes) — not a stray, whether or not the caller
# happens to have it gitignored.
while IFS= read -r line; do
  [ -z "$line" ] && continue
  path="${line:3}"
  case "$path" in
    "$REPORT_PATH"|.pr-review/*) continue ;;
  esac
  fail "stray path outside the report: $line"
done <<< "$(git status --porcelain)"

echo "verify-net-zero: clean — only $REPORT_PATH present."
