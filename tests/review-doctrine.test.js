#!/usr/bin/env node
// The ladder block inside skills/rig-review/SKILL.md is generated from
// skills/rig/SKILL.md by scripts/build-review-doctrine.js. This is the
// staleness backstop (like tests/openclaw-skills.test.js): fails if the
// committed copy drifts from what the generator would produce right now.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { deriveLadder, render, SOURCE_SKILL, TARGET_SKILL } = require('../scripts/build-review-doctrine');

test('ladder block in skills/rig-review/SKILL.md matches the generator', () => {
  const sourceSkillText = fs.readFileSync(SOURCE_SKILL, 'utf8');
  const targetSkillText = fs.readFileSync(TARGET_SKILL, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(
    render(sourceSkillText, targetSkillText),
    targetSkillText,
    'stale — run: node scripts/build-review-doctrine.js',
  );
});

test('derived ladder is the verbatim "## The ladder" section', () => {
  const sourceSkillText = fs.readFileSync(SOURCE_SKILL, 'utf8');
  const ladder = deriveLadder(sourceSkillText);
  assert.ok(ladder.startsWith('## The ladder'));
  assert.ok(!ladder.includes('\n## '), 'derived ladder should stop before the next heading');
});
