#!/usr/bin/env node
/**
 * Opt-in D12 theme visual scaffold runner (cross-platform).
 * Sets THEME_VISUAL=1 then invokes Playwright on the scaffold suite.
 *
 * Usage:
 *   node scripts/test/run-theme-visual.mjs
 *   node scripts/test/run-theme-visual.mjs --update-snapshots
 *   npm run test:visual:theme
 *   npm run test:visual:theme:update
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = [
  'playwright',
  'test',
  'tests/visual/theme-appearance-scaffold.test.ts',
  ...process.argv.slice(2),
];

const result = spawnSync('npx', args, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, THEME_VISUAL: '1' },
  shell: true,
});

process.exit(result.status ?? 1);
