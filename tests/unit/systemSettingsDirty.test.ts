// tests/unit/systemSettingsDirty.test.ts
import { describe, it, expect } from 'vitest';
import {
  snapshotSettingsPartitions,
  diffSettingsPartitions,
} from '@/components/settings/domain/settingsDirty';

describe('settingsDirty', () => {
  it('UT-P0-04 detects runtime partition dirty', () => {
    const baseline = snapshotSettingsPartitions({
      llm: { a: 1 },
      toolStrategy: {},
      runtime: { llm: { maxRetries: 2 } },
      proxy: {},
      appearance: {},
    });
    const current = snapshotSettingsPartitions({
      llm: { a: 1 },
      toolStrategy: {},
      runtime: { llm: { maxRetries: 4 } },
      proxy: {},
      appearance: {},
    });
    expect(diffSettingsPartitions(baseline, current)).toEqual(['runtime']);
  });

  it('UT-P0-05 ignores identical payloads', () => {
    const snap = snapshotSettingsPartitions({
      llm: { a: 1 },
      toolStrategy: { t: 1 },
      runtime: { r: 1 },
      proxy: { p: 1 },
      appearance: { d: 'simple' },
    });
    expect(diffSettingsPartitions(snap, snap)).toEqual([]);
  });
});
