import { configCenter } from '@/common/config/ConfigCenter';

import { StorageService } from './storageService';

export type DeveloperLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface DeveloperDiagnosticSettings {
  performanceEnableMonitoring: boolean;
  eventDebugEnabled: boolean;
  errorTrackerEnabled: boolean;
  analyticsEnabled: boolean;
  enableExperimentalFeatures: boolean;
  enableBetaFeatures: boolean;
  enableDebugMode: boolean;
  loggerMinLevel: DeveloperLogLevel;
}

const STORAGE_KEY = 'developer_diagnostic_settings';
const LOG_LEVELS = new Set<DeveloperLogLevel>(['debug', 'info', 'warn', 'error', 'fatal']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStoredBooleanFlag(key: string): boolean {
  const value = StorageService.get<unknown>(key, 'false');
  return value === true || value === 'true' || value === '1';
}

function normalizeLogLevel(value: unknown, fallback: DeveloperLogLevel): DeveloperLogLevel {
  return typeof value === 'string' && LOG_LEVELS.has(value as DeveloperLogLevel)
    ? (value as DeveloperLogLevel)
    : fallback;
}

function getDefaultSettings(): DeveloperDiagnosticSettings {
  return {
    performanceEnableMonitoring: configCenter.get<boolean>('performance.enableMonitoring', true),
    eventDebugEnabled: getStoredBooleanFlag('debug_events'),
    errorTrackerEnabled: configCenter.get<boolean>('errorTracker.enabled', true),
    analyticsEnabled: configCenter.get<boolean>('analytics.enabled', true),
    enableExperimentalFeatures: configCenter.get<boolean>(
      'features.enableExperimentalFeatures',
      false
    ),
    enableBetaFeatures: configCenter.get<boolean>('features.enableBetaFeatures', false),
    enableDebugMode: configCenter.get<boolean>('features.enableDebugMode', false),
    loggerMinLevel: normalizeLogLevel(configCenter.get<string>('logger.minLevel', 'info'), 'info'),
  };
}

function normalizeSettings(value: unknown): DeveloperDiagnosticSettings {
  const fallback = getDefaultSettings();
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    performanceEnableMonitoring:
      typeof value.performanceEnableMonitoring === 'boolean'
        ? value.performanceEnableMonitoring
        : fallback.performanceEnableMonitoring,
    eventDebugEnabled:
      typeof value.eventDebugEnabled === 'boolean'
        ? value.eventDebugEnabled
        : fallback.eventDebugEnabled,
    errorTrackerEnabled:
      typeof value.errorTrackerEnabled === 'boolean'
        ? value.errorTrackerEnabled
        : fallback.errorTrackerEnabled,
    analyticsEnabled:
      typeof value.analyticsEnabled === 'boolean'
        ? value.analyticsEnabled
        : fallback.analyticsEnabled,
    enableExperimentalFeatures:
      typeof value.enableExperimentalFeatures === 'boolean'
        ? value.enableExperimentalFeatures
        : fallback.enableExperimentalFeatures,
    enableBetaFeatures:
      typeof value.enableBetaFeatures === 'boolean'
        ? value.enableBetaFeatures
        : fallback.enableBetaFeatures,
    enableDebugMode:
      typeof value.enableDebugMode === 'boolean' ? value.enableDebugMode : fallback.enableDebugMode,
    loggerMinLevel: normalizeLogLevel(value.loggerMinLevel, fallback.loggerMinLevel),
  };
}

export function getDeveloperDiagnosticSettings(): DeveloperDiagnosticSettings {
  return normalizeSettings(StorageService.get<unknown>(STORAGE_KEY, null));
}

export function applyDeveloperDiagnosticSettings(
  settings = getDeveloperDiagnosticSettings()
): void {
  configCenter.set('performance.enableMonitoring', settings.performanceEnableMonitoring);
  configCenter.set('errorTracker.enabled', settings.errorTrackerEnabled);
  configCenter.set('analytics.enabled', settings.analyticsEnabled);
  configCenter.set('features.enableExperimentalFeatures', settings.enableExperimentalFeatures);
  configCenter.set('features.enableBetaFeatures', settings.enableBetaFeatures);
  configCenter.set('features.enableDebugMode', settings.enableDebugMode);
  configCenter.set('logger.minLevel', settings.loggerMinLevel);
  StorageService.set('debug_events', settings.eventDebugEnabled ? 'true' : 'false');
}

export function saveDeveloperDiagnosticSettings(
  settings: DeveloperDiagnosticSettings
): DeveloperDiagnosticSettings {
  const normalized = normalizeSettings(settings);
  StorageService.set(STORAGE_KEY, normalized);
  applyDeveloperDiagnosticSettings(normalized);
  return normalized;
}

export function updateDeveloperDiagnosticSetting<Key extends keyof DeveloperDiagnosticSettings>(
  key: Key,
  value: DeveloperDiagnosticSettings[Key]
): DeveloperDiagnosticSettings {
  return saveDeveloperDiagnosticSettings({
    ...getDeveloperDiagnosticSettings(),
    [key]: value,
  });
}
