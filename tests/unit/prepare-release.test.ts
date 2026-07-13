import { describe, expect, it } from 'vitest';
import { extractChangelogSection } from '../../scripts/release/prepare-release';

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
