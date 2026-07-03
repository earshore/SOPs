import { StorageService, STORAGE_KEYS } from './storageService';

const ENV_FEATURE_FLAG_PREFIX = 'VITE_FEATURE_';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on', 'enabled']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off', 'disabled']);

export function normalizeFeatureFlagName(flagName: string): string {
  return flagName
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function getFeatureFlagStorageKey(flagName: string): string {
  const normalized = normalizeFeatureFlagName(flagName);
  return `${STORAGE_KEYS.FEATURE_FLAGS_PREFIX}${normalized}`;
}

export function getFeatureFlagEnvKey(flagName: string): string {
  const normalized = normalizeFeatureFlagName(flagName).toUpperCase();
  return `${ENV_FEATURE_FLAG_PREFIX}${normalized}`;
}

export function parseFeatureFlagValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }
  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return null;
}

function readEnvFeatureFlag(flagName: string): boolean | null {
  const env = import.meta.env as unknown as Record<string, unknown>;
  return parseFeatureFlagValue(env[getFeatureFlagEnvKey(flagName)]);
}

export class FeatureFlagService {
  isEnabled(flagName: string, defaultEnabled = false): boolean {
    if (!normalizeFeatureFlagName(flagName)) {
      return defaultEnabled;
    }

    const envValue = readEnvFeatureFlag(flagName);
    if (envValue !== null) {
      return envValue;
    }

    const storageValue = StorageService.get<unknown>(getFeatureFlagStorageKey(flagName), null);
    return parseFeatureFlagValue(storageValue) ?? defaultEnabled;
  }
}

export const featureFlagService = new FeatureFlagService();
