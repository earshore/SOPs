import { describe, expect, it } from 'vitest';
import { DEFAULT_RUNTIME_STRATEGY_SETTINGS } from '@/services/runtimeStrategyService';
import { applyRuntimePreset, matchRuntimePreset } from './settingsPresets';

describe('runtime strategy presets', () => {
  it.each([
    ['speed', 'fast', 'speed'],
    ['cost', 'balanced', 'recommended'],
    ['reliability', 'deep', 'reliability'],
  ] as const)(
    '%s keeps the %s evidence-depth and %s scheduling pair together',
    (presetId, evidenceDepth, schedulingPreference) => {
      const settings = applyRuntimePreset(DEFAULT_RUNTIME_STRATEGY_SETTINGS, presetId);

      expect(settings.masterAnalysis).toMatchObject({ evidenceDepth, schedulingPreference });
      expect(matchRuntimePreset(settings)).toBe(presetId);
    }
  );

  it('marks an unmatched evidence-depth and scheduling pair as custom', () => {
    const settings = applyRuntimePreset(DEFAULT_RUNTIME_STRATEGY_SETTINGS, 'speed');
    settings.masterAnalysis.evidenceDepth = 'deep';

    expect(matchRuntimePreset(settings)).toBeNull();
  });
});
