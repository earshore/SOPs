import { describe, expect, it } from 'vitest';

async function loadPolicy(): Promise<Record<string, unknown>> {
  const policyPath = '../../scripts/release/release-history-policy.mjs';
  return import(policyPath);
}

describe('release history policy', () => {
  it('keeps duplicate mistaken RC aliases as tag-only archives', async () => {
    const policy = await loadPolicy();
    const isTagOnlyArchiveTag = policy.isTagOnlyArchiveTag as
      | ((tag: string) => boolean)
      | undefined;
    const isTagOnlyArchiveVersion = policy.isTagOnlyArchiveVersion as
      | ((version: string) => boolean)
      | undefined;

    expect(typeof isTagOnlyArchiveTag).toBe('function');
    expect(typeof isTagOnlyArchiveVersion).toBe('function');
    expect(isTagOnlyArchiveTag?.('v3.0.5-rc.1')).toBe(true);
    expect(isTagOnlyArchiveTag?.('v3.0.5-rc.2')).toBe(true);
    expect(isTagOnlyArchiveVersion?.('3.0.5-rc.1')).toBe(true);
    expect(isTagOnlyArchiveVersion?.('3.0.5-rc.2')).toBe(true);
  });

  it('keeps unique RC versions on the GitHub Releases page', async () => {
    const policy = await loadPolicy();
    const isTagOnlyArchiveVersion = policy.isTagOnlyArchiveVersion as
      | ((version: string) => boolean)
      | undefined;

    expect(isTagOnlyArchiveVersion?.('3.0.4-rc.9')).toBe(false);
    expect(isTagOnlyArchiveVersion?.('3.0.4-rc.10')).toBe(false);
    expect(isTagOnlyArchiveVersion?.('3.0.6')).toBe(false);
  });
});
