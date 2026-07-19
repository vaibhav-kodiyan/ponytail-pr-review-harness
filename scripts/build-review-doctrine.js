#!/usr/bin/env node
// Regenerates the ladder block inside skills/rig-review/SKILL.md from the
// canonical "## The ladder" section of skills/rig/SKILL.md, so the review
// skill's copy of the ladder can never drift from the one rig actually
// ships. Same generate-then-verify shape as build-openclaw-skills.js:
// tests/review-doctrine.test.js fails if the committed copy goes stale.
//
// Run: node scripts/build-review-doctrine.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE_SKILL = path.join(ROOT, 'skills', 'rig', 'SKILL.md');
const TARGET_SKILL = path.join(ROOT, 'skills', 'rig-review', 'SKILL.md');

const BEGIN_MARKER = '<!-- BEGIN GENERATED LADDER -->';
const END_MARKER = '<!-- END GENERATED LADDER -->';

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pull "## The ladder" verbatim out of skills/rig/SKILL.md: from that
// heading up to (not including) the next "## " heading.
function deriveLadder(sourceSkillText) {
  const text = sourceSkillText.replace(/\r\n/g, '\n');
  const heading = text.match(/^## The ladder$/m);
  if (!heading) throw new Error('skills/rig/SKILL.md has no "## The ladder" section');
  const start = heading.index;
  const afterHeading = start + heading[0].length;
  const nextHeading = text.slice(afterHeading).match(/\n## /);
  const end = nextHeading ? afterHeading + nextHeading.index : text.length;
  return text.slice(start, end).trimEnd();
}

function render(sourceSkillText, targetSkillText) {
  const ladder = deriveLadder(sourceSkillText);
  const markerRe = new RegExp(`${escapeRegExp(BEGIN_MARKER)}[\\s\\S]*?${escapeRegExp(END_MARKER)}`);
  if (!markerRe.test(targetSkillText)) {
    throw new Error(`skills/rig-review/SKILL.md is missing the ${BEGIN_MARKER} / ${END_MARKER} markers`);
  }
  return targetSkillText.replace(markerRe, `${BEGIN_MARKER}\n${ladder}\n${END_MARKER}`);
}

module.exports = { deriveLadder, render, BEGIN_MARKER, END_MARKER, SOURCE_SKILL, TARGET_SKILL };

if (require.main === module) {
  const sourceSkillText = fs.readFileSync(SOURCE_SKILL, 'utf8');
  const targetSkillText = fs.readFileSync(TARGET_SKILL, 'utf8');
  fs.writeFileSync(TARGET_SKILL, render(sourceSkillText, targetSkillText));
  console.log('wrote', path.relative(ROOT, TARGET_SKILL).replace(/\\/g, '/'));
}
