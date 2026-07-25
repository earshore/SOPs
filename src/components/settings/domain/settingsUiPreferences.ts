// src/components/settings/domain/settingsUiPreferences.ts
// Persist settings panel UI prefs (density). Not part of dirty partitions.

import { StorageService } from '@/services/storageService';

export type SettingsDensity = 'simple' | 'advanced';

export interface SettingsUiPreferences {
  density: SettingsDensity;
}

/** StorageService key — Spec §3.3 */
export const SETTINGS_UI_PREFERENCES_KEY = 'settings_ui_preferences_v1';

const DEFAULT_PREFERENCES: SettingsUiPreferences = {
  density: 'simple',
};

function isSettingsDensity(value: unknown): value is SettingsDensity {
  return value === 'simple' || value === 'advanced';
}

export function getSettingsUiPreferences(): SettingsUiPreferences {
  const raw = StorageService.get<Partial<SettingsUiPreferences> | null>(
    SETTINGS_UI_PREFERENCES_KEY,
    null
  );
  if (raw && isSettingsDensity(raw.density)) {
    return { density: raw.density };
  }
  return { ...DEFAULT_PREFERENCES };
}

export function saveSettingsUiPreferences(prefs: { density: SettingsDensity }): void {
  const density = isSettingsDensity(prefs?.density) ? prefs.density : 'simple';
  StorageService.set(SETTINGS_UI_PREFERENCES_KEY, { density } satisfies SettingsUiPreferences);
}
