import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FUNCTIONAL_E2E_GROUPS,
  buildNpxInvocation,
  isFunctionalReportComplete,
} from '../../scripts/test/run-functional-e2e';

describe('functional E2E groups', () => {
  it('lists every non-release, non-performance spec exactly once', () => {
    const discovered = readdirSync('tests/e2e')
      .filter(name => name.endsWith('.spec.ts'))
      .filter(name => name !== 'release-smoke.spec.ts')
      .filter(name => !name.endsWith('-performance.spec.ts'))
      .map(name => `tests/e2e/${name}`)
      .sort();
    const listed = FUNCTIONAL_E2E_GROUPS.flatMap(group => group.files).sort();

    expect(listed).toEqual(discovered);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('defines the four intended execution groups', () => {
    expect(FUNCTIONAL_E2E_GROUPS).toEqual([
      {
        name: 'analysis',
        files: [
          'tests/e2e/ai-analysis-confidence.spec.ts',
          'tests/e2e/ai-analysis.spec.ts',
          'tests/e2e/promptlab-dna-extraction.spec.ts',
          'tests/e2e/promptlab.spec.ts',
          'tests/e2e/scraper.spec.ts',
        ],
      },
      {
        name: 'deep-chat',
        files: ['tests/e2e/deep-chat-prompt-preview.spec.ts', 'tests/e2e/deep-chat-send.spec.ts'],
      },
      {
        name: 'keyword-hunter',
        files: [
          'tests/e2e/keyword-hunter-analysis.spec.ts',
          'tests/e2e/keyword-hunter-input.spec.ts',
          'tests/e2e/keyword-hunter-process.spec.ts',
        ],
      },
      {
        name: 'operations',
        files: ['tests/e2e/npi-tracker.spec.ts', 'tests/e2e/restricted-words.spec.ts'],
      },
    ]);
  });

  it('runs every functional group through the built-artifact config', () => {
    const source = readFileSync('scripts/test/run-functional-e2e.ts', 'utf8');

    expect(source).toContain('--config=config/playwright.release.config.ts');
    expect(source).toContain("PLAYWRIGHT_RELEASE_SUITE: 'functional'");
  });

  it('routes npx.cmd through ComSpec on Windows', () => {
    const playwrightArgs = ['playwright', 'test', 'tests/e2e/example.spec.ts'];

    expect(buildNpxInvocation('win32', 'C:\\Windows\\System32\\cmd.exe', playwrightArgs)).toEqual({
      command: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'npx.cmd', ...playwrightArgs],
    });
  });

  it('invokes npx directly outside Windows', () => {
    const playwrightArgs = ['playwright', 'test', 'tests/e2e/example.spec.ts'];

    expect(buildNpxInvocation('linux', undefined, playwrightArgs)).toEqual({
      command: 'npx',
      args: playwrightArgs,
    });
  });

  it('rejects zero-test, unexpected, and skipped reports', () => {
    expect(
      isFunctionalReportComplete({
        stats: { expected: 12, unexpected: 0, skipped: 0 },
      })
    ).toBe(true);
    expect(
      isFunctionalReportComplete({
        stats: { expected: 0, unexpected: 0, skipped: 0 },
      })
    ).toBe(false);
    expect(
      isFunctionalReportComplete({
        stats: { expected: 11, unexpected: 1, skipped: 0 },
      })
    ).toBe(false);
    expect(
      isFunctionalReportComplete({
        stats: { expected: 11, unexpected: 0, skipped: 1 },
      })
    ).toBe(false);
  });
});
