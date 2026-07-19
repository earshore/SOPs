/**
 * Local release-candidate gate: ordered fail-fast stages.
 * Production HTTP verification is a separate command (release:production-gate).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ReleaseStage {
  name: string;
  script: string;
}

export type ReleaseStageRunner = (stage: ReleaseStage) => number;

export const RELEASE_STAGES: ReleaseStage[] = [
  { name: 'security', script: 'ci:security' },
  { name: 'quality', script: 'ci:quality' },
  { name: 'coverage', script: 'test:coverage' },
  { name: 'tech-debt', script: 'tech-debt:gate' },
  { name: 'build', script: 'build:app' },
  { name: 'artifact-contract', script: 'release:artifact-contract' },
  { name: 'release-smoke', script: 'test:e2e:smoke:release' },
  { name: 'performance', script: 'test:performance:gate' },
  { name: 'release-notes', script: 'release:notes' },
  { name: 'release-package', script: 'release:package' },
];

export function runReleaseStages(
  stages: ReleaseStage[],
  runner: ReleaseStageRunner = defaultStageRunner
): void {
  for (const stage of stages) {
    const code = runner(stage);
    if (code !== 0) {
      throw new Error(`release stage failed: ${stage.name}`);
    }
  }
}

function defaultStageRunner(stage: ReleaseStage): number {
  const result = spawnSync('npm', ['run', stage.script], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  return result.status ?? 1;
}

function writeReadiness(ok: boolean, error?: string): void {
  const outDir = resolve(process.cwd(), 'release-artifacts');
  mkdirSync(outDir, { recursive: true });
  const payload = {
    status: ok ? 'release-candidate-ready' : 'failed',
    production: 'externally-unverified',
    stages: RELEASE_STAGES.map(s => s.name),
    error: error ?? null,
    at: new Date().toISOString(),
  };
  writeFileSync(resolve(outDir, 'release-readiness.json'), JSON.stringify(payload, null, 2) + '\n');
}

function main(): void {
  try {
    runReleaseStages(RELEASE_STAGES);
    writeReadiness(true);
    console.log('release:gate passed (RC ready; production externally unverified)');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    writeReadiness(false, message);
    console.error(message);
    process.exit(1);
  }
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('run-release-gate.ts');
if (isMain) {
  main();
}
