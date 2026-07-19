import { describe, expect, it, vi } from 'vitest';
import {
  RELEASE_STAGES,
  runReleaseStages,
  type ReleaseStageRunner,
} from '../../scripts/release/run-release-gate';

describe('release gate orchestration', () => {
  it('keeps the approved stage order', () => {
    expect(RELEASE_STAGES.map(stage => stage.name)).toEqual([
      'security',
      'quality',
      'coverage',
      'tech-debt',
      'build',
      'artifact-contract',
      'release-smoke',
      'performance',
      'release-notes',
      'release-package',
    ]);
  });

  it('stops after the first failed stage', () => {
    const runner: ReleaseStageRunner = vi.fn(stage => (stage.name === 'coverage' ? 1 : 0));
    expect(() => runReleaseStages(RELEASE_STAGES, runner)).toThrow('release stage failed: coverage');
    expect(runner).toHaveBeenCalledTimes(3);
  });
});
