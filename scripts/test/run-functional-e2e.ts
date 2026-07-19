import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface FunctionalJsonReport {
  stats?: {
    expected?: number;
    unexpected?: number;
    skipped?: number;
  };
}

export function isFunctionalReportComplete(report: FunctionalJsonReport): boolean {
  return (
    typeof report.stats?.expected === 'number' &&
    report.stats.expected > 0 &&
    report.stats.unexpected === 0 &&
    report.stats.skipped === 0
  );
}

export function buildNpxInvocation(
  platform: NodeJS.Platform,
  comSpec: string | undefined,
  args: readonly string[]
): { command: string; args: string[] } {
  if (platform === 'win32') {
    return {
      command: comSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', 'npx.cmd', ...args],
    };
  }

  return { command: 'npx', args: [...args] };
}

export const FUNCTIONAL_E2E_GROUPS = [
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
] as const;

export function runFunctionalGroups(): number {
  const failed: string[] = [];

  for (const group of FUNCTIONAL_E2E_GROUPS) {
    const reportPath = resolve(`tests/playwright-report/functional-${group.name}.json`);
    let reportFresh = true;

    try {
      rmSync(reportPath, { force: true });
    } catch {
      reportFresh = false;
    }

    const invocation = buildNpxInvocation(process.platform, process.env.ComSpec, [
      'playwright',
      'test',
      ...group.files,
      '--config=config/playwright.release.config.ts',
      '--project=chromium',
      '--workers=1',
    ]);
    const result = spawnSync(invocation.command, invocation.args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_RELEASE_SUITE: 'functional',
        PLAYWRIGHT_FUNCTIONAL_GROUP: group.name,
      },
    });
    let complete = false;

    if (reportFresh) {
      try {
        const report = JSON.parse(readFileSync(reportPath, 'utf8')) as FunctionalJsonReport;
        complete = isFunctionalReportComplete(report);
      } catch {
        complete = false;
      }
    }

    if (result.status !== 0 || !complete) failed.push(group.name);
  }

  if (failed.length > 0) {
    console.error(`Functional E2E groups failed: ${failed.join(', ')}`);
    return 1;
  }

  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exit(runFunctionalGroups());
}
