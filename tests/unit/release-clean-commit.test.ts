import { describe, expect, it } from 'vitest';
import * as releaseHelpers from '../../scripts/release/prepare-release';

type ReleaseCommitResolver = (status: string, headSha: string) => string;
type ReleaseBodyBuilder = (version: string, changelogSection: string, headSha?: string) => string;

const resolveCleanReleaseCommit = (
  releaseHelpers as typeof releaseHelpers & {
    resolveCleanReleaseCommit?: ReleaseCommitResolver;
  }
).resolveCleanReleaseCommit;

const buildReleaseBody = (
  releaseHelpers as typeof releaseHelpers & {
    buildReleaseBody?: ReleaseBodyBuilder;
  }
).buildReleaseBody;

const HEAD_SHA = '0123456789abcdef0123456789abcdef01234567';

describe('release clean-commit guard', () => {
  it('returns the resolved HEAD SHA when porcelain status is clean', () => {
    expect(typeof resolveCleanReleaseCommit).toBe('function');
    expect(resolveCleanReleaseCommit?.('', HEAD_SHA)).toBe(HEAD_SHA);
  });

  it('rejects tracked worktree changes before release metadata is created', () => {
    expect(() => resolveCleanReleaseCommit?.(' M src/main.ts', HEAD_SHA)).toThrow(
      /clean git worktree/i
    );
  });

  it('accepts ignored dist and release artifacts status entries', () => {
    expect(resolveCleanReleaseCommit?.('!! dist/\n!! release-artifacts/', HEAD_SHA)).toBe(HEAD_SHA);
  });

  it('accepts raw porcelain output for the XSS scanner modified-report entry', () => {
    expect(resolveCleanReleaseCommit?.(' M docs/XSS_SCAN_REPORT.md\r\n', HEAD_SHA)).toBe(HEAD_SHA);
  });

  it('uses the resolved SHA in release notes', () => {
    const body = buildReleaseBody?.(
      '3.0.8',
      '## [3.0.8]\n\n### Fixed\n- release binding',
      HEAD_SHA
    );

    expect(body).toContain(`\`${HEAD_SHA.slice(0, 12)}\``);
  });
});
