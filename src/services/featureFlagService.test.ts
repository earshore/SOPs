import { beforeEach, describe, expect, it } from 'vitest';
import {
  FeatureFlagService,
  getFeatureFlagEnvKey,
  getFeatureFlagStorageKey,
  normalizeFeatureFlagName,
  parseFeatureFlagValue,
} from '@/services/featureFlagService';
import { StorageService } from '@/services/storageService';

describe('featureFlagService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes feature flag keys for env and StorageService sources', () => {
    expect(normalizeFeatureFlagName('playground.deepChat')).toBe('playground_deep_chat');
    expect(getFeatureFlagEnvKey('playground.deepChat')).toBe('VITE_FEATURE_PLAYGROUND_DEEP_CHAT');
    expect(getFeatureFlagStorageKey('playground.deepChat')).toBe('feature_playground_deep_chat');
  });

  it('parses explicit boolean-like values', () => {
    expect(parseFeatureFlagValue(true)).toBe(true);
    expect(parseFeatureFlagValue('enabled')).toBe(true);
    expect(parseFeatureFlagValue('0')).toBe(false);
    expect(parseFeatureFlagValue('disabled')).toBe(false);
    expect(parseFeatureFlagValue('unknown')).toBeNull();
  });

  it('uses StorageService feature flags before falling back to the route default', () => {
    const service = new FeatureFlagService();

    expect(service.isEnabled('playground.deepChat', true)).toBe(true);

    StorageService.set(getFeatureFlagStorageKey('playground.deepChat'), false);
    expect(service.isEnabled('playground.deepChat', true)).toBe(false);

    StorageService.set(getFeatureFlagStorageKey('playground.deepChat'), 'enabled');
    expect(service.isEnabled('playground.deepChat', false)).toBe(true);
  });
});
