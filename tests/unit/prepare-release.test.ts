import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as releaseHelpers from '../../scripts/release/prepare-release';

const { extractChangelogSection } = releaseHelpers;
const assertAnnotatedTagAtHead = (
  releaseHelpers as typeof releaseHelpers & {
    assertAnnotatedTagAtHead?: (binding: {
      tag: string;
      exists: boolean;
      objectType?: string;
      tagSha?: string;
      headSha: string;
    }) => void;
  }
).assertAnnotatedTagAtHead;
const clearCurrentVersionArchives = (
  releaseHelpers as typeof releaseHelpers & {
    clearCurrentVersionArchives?: (artifactsDir: string, version: string) => void;
  }
).clearCurrentVersionArchives;

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('extractChangelogSection', () => {
  const sample = `# Changelog

## [Unreleased]

- pending

## [3.0.5-rc.1] - 2026-07-13

### Added
- feature a

### Fixed
- bug b

## [3.0.4] - 2026-07-06

### Added
- old
`;

  it('extracts a version section until the next heading', () => {
    const section = extractChangelogSection(sample, '3.0.5-rc.1');
    expect(section).toContain('## [3.0.5-rc.1]');
    expect(section).toContain('feature a');
    expect(section).toContain('bug b');
    expect(section).not.toContain('## [3.0.4]');
    expect(section).not.toContain('pending');
  });

  it('throws when the version section is missing', () => {
    expect(() => extractChangelogSection(sample, '9.9.9')).toThrow(/no section/);
  });
});

describe('buildReleaseBody', () => {
  it('describes v3.0.7 release candidates as production verification prereleases', () => {
    const buildReleaseBody = (
      releaseHelpers as typeof releaseHelpers & {
        buildReleaseBody?: (version: string, changelogSection: string) => string;
      }
    ).buildReleaseBody;

    expect(typeof buildReleaseBody).toBe('function');
    const body = buildReleaseBody?.('3.0.7-rc.2', '## [3.0.7-rc.2]\n\n### Fixed\n- item');
    expect(body).toContain('**发布通道：** Release Candidate');
    expect(body).toContain('**环境：** Production verification');
    expect(body).toContain('GitHub Latest 应仍指向最新 GA');
  });
});

describe('release tag binding', () => {
  const HEAD_SHA = '0123456789abcdef0123456789abcdef01234567';
  const TAG_SHA = 'fedcba9876543210fedcba9876543210fedcba98';

  it('rejects a missing release tag', () => {
    expect(() =>
      assertAnnotatedTagAtHead?.({
        tag: 'v3.0.8',
        exists: false,
        headSha: HEAD_SHA,
      })
    ).toThrow(/does not exist/i);
  });

  it('rejects a lightweight tag', () => {
    expect(() =>
      assertAnnotatedTagAtHead?.({
        tag: 'v3.0.8',
        exists: true,
        objectType: 'commit',
        tagSha: HEAD_SHA,
        headSha: HEAD_SHA,
      })
    ).toThrow(/annotated/i);
  });

  it('rejects an annotated tag that points at another commit', () => {
    expect(() =>
      assertAnnotatedTagAtHead?.({
        tag: 'v3.0.8',
        exists: true,
        objectType: 'tag',
        tagSha: TAG_SHA,
        headSha: HEAD_SHA,
      })
    ).toThrow(/mismatch/i);
  });

  it('accepts an annotated tag at HEAD', () => {
    expect(() =>
      assertAnnotatedTagAtHead?.({
        tag: 'v3.0.8',
        exists: true,
        objectType: 'tag',
        tagSha: HEAD_SHA,
        headSha: HEAD_SHA,
      })
    ).not.toThrow();
  });
});

describe('tag-bound release commands', () => {
  it('routes notes and packages through the shared validated release context', () => {
    const source = readRepoFile('scripts/release/prepare-release.ts');

    expect(source).toMatch(
      /function commandNotes[\s\S]*?resolveValidatedReleaseContext\(flags, true\)/
    );
    expect(source).toMatch(
      /async function commandPackage[\s\S]*?resolveValidatedReleaseContext\(flags, true\)/
    );
  });
});

describe('release archive cleanup', () => {
  it('removes only stale archives for the version being packaged', () => {
    const artifactsDir = mkdtempSync(join(tmpdir(), 'release-artifacts-'));
    const currentZip = join(artifactsDir, 'sops-dist-3.0.8.zip');
    const currentTgz = join(artifactsDir, 'sops-dist-3.0.8.tar.gz');
    const historicalZip = join(artifactsDir, 'sops-dist-3.0.7.zip');

    writeFileSync(currentZip, 'stale zip');
    writeFileSync(currentTgz, 'stale tarball');
    writeFileSync(historicalZip, 'keep');

    try {
      clearCurrentVersionArchives?.(artifactsDir, '3.0.8');

      expect(existsSync(currentZip)).toBe(false);
      expect(existsSync(currentTgz)).toBe(false);
      expect(existsSync(historicalZip)).toBe(true);
    } finally {
      rmSync(artifactsDir, { recursive: true, force: true });
    }
  });
});

describe('v3.0.11-rc.5 release metadata', () => {
  it('locks package and lockfile root versions to 3.0.11-rc.5', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as { version: string };
    const packageLock = JSON.parse(readRepoFile('package-lock.json')) as {
      version: string;
      packages: Record<string, { version?: string }>;
    };

    expect(packageJson.version).toBe('3.0.11-rc.5');
    expect(packageLock.version).toBe('3.0.11-rc.5');
    expect(packageLock.packages['']?.version).toBe('3.0.11-rc.5');
  });

  it('places 3.0.11-rc.5 notes before the preserved 3.0.10 GA section', () => {
    const changelog = readRepoFile('docs/CHANGELOG.md');
    const rcStart = changelog.indexOf('## [3.0.11-rc.5] - 2026-07-23');
    const gaStart = changelog.indexOf('## [3.0.10] - 2026-07-20');
    const nextReleaseStart = changelog.indexOf('\n## [', rcStart + 1);

    expect(rcStart).toBeGreaterThan(-1);
    expect(gaStart).toBeGreaterThan(rcStart);
    expect(nextReleaseStart).toBeGreaterThan(rcStart);

    const rcSection = changelog.slice(rcStart, nextReleaseStart);
    expect(rcSection).toMatch(/Pre-release|生产验证候选/);
    expect(rcSection).toMatch(/`v3\.0\.10`/);
    expect(rcSection).toContain('https://sops.hongecb.store');
    expect(rcSection).toContain('### Changed');
    expect(rcSection).toContain('### Fixed');
  });

  it('publishes the current GA, package RC, and previous GA in README', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toMatch(/\|\s*\*\*GitHub Latest（稳定 GA）\*\*\s*\|\s*`v3\.0\.10`\s*\|/);
    expect(readme).toMatch(/\|\s*\*\*当前 Pre-release 候选\*\*\s*\|\s*`v3\.0\.11-rc\.5`\s*\|/);
    expect(readme).toMatch(/\|\s*package\.json\s*\|\s*`3\.0\.11-rc\.5`\s*\|/);
    expect(readme).toMatch(/\|\s*上一 GA\s*\|\s*`v3\.0\.10`\s*\|/);
    expect(readme).toContain('`0.1.0`…`3.0.11-rc.5`');
    expect(readme).toContain('当前稳定版为 `v3.0.10`');
  });

  it('declares 3.0.10 GA and 3.0.11-rc.5 candidate in release policy', () => {
    const policy = readRepoFile('docs/RELEASE_POLICY.md');

    expect(policy).toMatch(/`v3\.0\.10`.*2026-07-20.*GA/);
    expect(policy).toMatch(/`v3\.0\.11-rc\.5`.*生产验证候选/);
    expect(policy).toContain('`v3.1.0-rc.1`');
    expect(policy).not.toMatch(/下一 patch 候选[^\n]*`v3\.0\.10-rc\.1`/);
  });

  it('uses illustrative RC and GA commands that do not re-open closed GA lines', () => {
    const policy = readRepoFile('docs/RELEASE_POLICY.md');
    const rcCommands = policy.slice(policy.indexOf('### 7.1'), policy.indexOf('### 7.2'));
    const gaCommands = policy.slice(policy.indexOf('### 7.2'), policy.indexOf('### 7.3'));

    expect(rcCommands).toMatch(/git tag -a v3\.\d+\.\d+-rc\.\d+/);
    expect(rcCommands).toContain('git push sops');
    expect(gaCommands).toMatch(/git tag -a v3\.\d+\.\d+/);
    expect(gaCommands).toContain('git push sops');
  });

  it('promotes only current GA as Latest in release maintenance scripts', () => {
    const backfill = readRepoFile('scripts/release/backfill-release-notes.mjs');
    const syncAll = readRepoFile('scripts/release/sync-all-releases.mjs');

    expect(backfill).toMatch(
      /const DEFAULT_VERSIONS = \[\s*'3\.0\.11-rc\.5',\s*'3\.0\.11-rc\.4',\s*'3\.0\.11-rc\.3',\s*'3\.0\.11-rc\.2',\s*'3\.0\.11-rc\.1',\s*'3\.0\.10',/
    );
    expect(backfill).toContain("version === '3.0.11-rc.5' ||");
    expect(backfill).toContain("version === '3.0.11-rc.4' ||");
    expect(backfill).toContain("else if (version === '3.0.10')");
    expect(backfill).not.toContain("else if (version === '3.0.9')");
    expect(syncAll).toContain("if (version === '3.0.10' && !pre)");
    expect(syncAll).not.toContain("if (version === '3.0.9' && !pre)");
  });

  it('derives rollback GA from the nearest following stable release', () => {
    const syncAll = readRepoFile('scripts/release/sync-all-releases.mjs');

    expect(syncAll).not.toContain('- 回滚：上一 GA 为 \\`v3.0.6\\`');
    expect(syncAll).toContain('function previousGaFor(version, versionSectionsOrdered)');
    expect(syncAll).toContain(
      'const currentIndex = versionSectionsOrdered.findIndex(candidate => candidate.version === version);'
    );
    expect(syncAll).toMatch(
      /versionSectionsOrdered\s*\.slice\(currentIndex \+ 1\)\s*\.find\(candidate => !isPre\(candidate\.version\)\)/
    );
    expect(syncAll).toContain('return previousGa?.version ?? null;');
    expect(syncAll).toContain(
      'function buildReleaseNotes(version, section, release, previousGa)'
    );
    expect(syncAll).toContain(
      'const previousGa = previousGaFor(version, versionSectionsOrdered);'
    );
    expect(syncAll).toContain(
      'buildReleaseNotes(version, sectionBody, release, previousGa)'
    );
    expect(syncAll).toContain('未找到更早 GA');
  });
});
