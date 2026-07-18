import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as releaseHelpers from '../../scripts/release/prepare-release';

const { extractChangelogSection } = releaseHelpers;

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

describe('v3.0.7 GA release metadata', () => {
  it('locks package and lockfile root versions to 3.0.7', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as { version: string };
    const packageLock = JSON.parse(readRepoFile('package-lock.json')) as {
      version: string;
      packages: Record<string, { version?: string }>;
    };

    expect(packageJson.version).toBe('3.0.7');
    expect(packageLock.version).toBe('3.0.7');
    expect(packageLock.packages['']?.version).toBe('3.0.7');
  });

  it('places complete 3.0.7 GA notes before the preserved rc.2 section', () => {
    const changelog = readRepoFile('docs/CHANGELOG.md');
    const gaStart = changelog.indexOf('## [3.0.7] - 2026-07-18');
    const rcStart = changelog.indexOf('## [3.0.7-rc.2] - 2026-07-14');

    expect(gaStart).toBeGreaterThan(-1);
    expect(rcStart).toBeGreaterThan(gaStart);

    const gaSection = changelog.slice(gaStart, rcStart);
    expect(gaSection).toMatch(/正式 GA/);
    expect(gaSection).toMatch(/Latest/);
    expect(gaSection).toMatch(/上一 GA[^\n]*`v3\.0\.6`/);
    expect(gaSection).toMatch(/回滚[^\n]*`v3\.0\.6`/);
    expect(gaSection).toContain('https://sops.hongecb.store');
    expect(gaSection).toContain('### Added');
    expect(gaSection).toContain('### Changed');
    expect(gaSection).toContain('### Fixed');
  });

  it('publishes the current, previous, package, and next README versions', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain('| **GitHub Latest（稳定 GA）** | `v3.0.7` |');
    expect(readme).toContain('| 下一候选命名（未发布） | `v3.0.8-rc.1` |');
    expect(readme).toContain('| package.json | `3.0.7` |');
    expect(readme).toContain('| 上一 GA | `v3.0.6` |');
    expect(readme).toContain('`0.1.0`…`3.0.7`');
    expect(readme).toContain('当前稳定版为 `v3.0.7`');
  });

  it('declares 3.0.7 GA and moves the next candidate to a new version line', () => {
    const policy = readRepoFile('docs/RELEASE_POLICY.md');

    expect(policy).toMatch(/`v3\.0\.7`（2026-07-18）为当前 GA/);
    expect(policy).toMatch(/下一 patch 候选[^\n]*`v3\.0\.8-rc\.1`/);
    expect(policy).toContain('`v3.1.0-rc.1`');
    expect(policy).not.toMatch(/下一候选[^\n]*`?3\.0\.7-rc\.3`?/);
  });

  it('promotes only 3.0.7 as Latest in release maintenance scripts', () => {
    const backfill = readRepoFile('scripts/release/backfill-release-notes.mjs');
    const syncAll = readRepoFile('scripts/release/sync-all-releases.mjs');

    expect(backfill).toMatch(/const DEFAULT_VERSIONS = \[\s*'3\.0\.7',/);
    expect(backfill).toContain("else if (version === '3.0.7')");
    expect(backfill).not.toContain("else if (version === '3.0.6')");
    expect(syncAll).toContain("if (version === '3.0.7' && !pre)");
    expect(syncAll).not.toContain("if (version === '3.0.6' && !pre)");
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
