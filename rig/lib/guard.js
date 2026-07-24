const fs = require('node:fs');
const path = require('node:path');

const FLOOR_PATTERN = [
  'sk-[A-Za-z0-9_-]{16,}',
  'ghp_[A-Za-z0-9]{20,}',
  'gho_[A-Za-z0-9]{20,}',
  'AKIA[0-9A-Z]{16}',
  'xox[baprs]-[A-Za-z0-9-]{10,}',
  '-----BEGIN [A-Z ]*PRIVATE KEY-----',
].join('|');

const GUARD_SCRIPT = `#!/bin/sh
# Rig Tier 2 Basic secret guard. Floor + tracked-.env always run; scanners supplement.
set -u
FLOOR='${FLOOR_PATTERN}'
block() { echo "rig secret guard: $1" >&2; exit 1; }

if git diff --cached --name-only -z | tr '\\0' '\\n' | grep -Eq '(^|/)\\.env$'; then
  block "a .env file is staged"
fi

if git diff --cached -U0 --no-color | grep -E '^\\+' | grep -Ev '^\\+\\+\\+' | grep -Eq "$FLOOR"; then
  block "a value-shaped secret is staged"
fi

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks protect --staged --no-banner
  code=$?
  if [ "$code" -eq 1 ]; then block "gitleaks flagged staged content"; fi
  if [ "$code" -gt 1 ]; then echo "rig warn: gitleaks failed; falling back to floor" >&2; fi
elif command -v trufflehog >/dev/null 2>&1; then
  trufflehog git file://. --since-commit HEAD --only-verified --fail
  code=$?
  if [ "$code" -ne 0 ]; then block "trufflehog flagged staged content"; fi
fi

exit 0
`;

const SHIM = `#!/bin/sh
# Rig secret guard shim. Managed by Rig; runs the guard then any chained hook.
DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
"$DIR/.rig/hooks/secret-guard.sh" "$@" || exit $?
if [ -x "$DIR/.git/hooks/pre-commit.rig-chained" ]; then
  "$DIR/.git/hooks/pre-commit.rig-chained" "$@" || exit $?
fi
exit 0
`;

function installGuard(target) {
  const guardPath = path.join(target, '.rig', 'hooks', 'secret-guard.sh');
  fs.mkdirSync(path.dirname(guardPath), { recursive: true });
  fs.writeFileSync(guardPath, GUARD_SCRIPT, { mode: 0o755 });

  const gitDir = path.join(target, '.git');
  if (!fs.existsSync(gitDir)) return { chainedBackup: false };
  const hooksDir = path.join(gitDir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  const hook = path.join(hooksDir, 'pre-commit');
  const chained = path.join(hooksDir, 'pre-commit.rig-chained');
  let chainedBackup = false;
  if (fs.existsSync(hook) && !fs.readFileSync(hook, 'utf8').includes('Rig secret guard shim')) {
    if (fs.existsSync(chained)) fs.rmSync(chained, { force: true });
    fs.renameSync(hook, chained);
    chainedBackup = true;
  } else if (fs.existsSync(chained)) {
    chainedBackup = true;
  }
  fs.writeFileSync(hook, SHIM, { mode: 0o755 });
  for (const name of fs.readdirSync(hooksDir)) {
    if (name.endsWith('.sample')) fs.rmSync(path.join(hooksDir, name), { force: true });
  }
  return { chainedBackup };
}

module.exports = { FLOOR_PATTERN, GUARD_SCRIPT, SHIM, installGuard };
