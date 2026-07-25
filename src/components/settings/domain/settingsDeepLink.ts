// src/components/settings/domain/settingsDeepLink.ts
// Deep-link options for system settings open (section scroll + focus expand).

import type { SettingsDensity } from '@/components/settings/domain/settingsUiPreferences';

export type { SettingsDensity } from '@/components/settings/domain/settingsUiPreferences';

export type SettingsSectionId =
  | 'settings-section-llm'
  | 'settings-section-tool-strategy'
  | 'settings-section-network'
  | 'settings-section-data'
  | 'settings-section-appearance'
  | 'settings-section-performance';

export interface SettingsOpenOptions {
  sectionId?: SettingsSectionId;
  /** Expand details / highlight card, e.g. 'ppc-thresholds' | 'master-analysis' | 'ppc-analysis-flags' */
  focus?: string;
  /** Open with advanced density when linking from module expert controls */
  density?: SettingsDensity;
}

export const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = [
  'settings-section-llm',
  'settings-section-tool-strategy',
  'settings-section-network',
  'settings-section-data',
  'settings-section-appearance',
  'settings-section-performance',
] as const;

const SECTION_ID_SET = new Set<string>(SETTINGS_SECTION_IDS);

export function isSettingsSectionId(value: unknown): value is SettingsSectionId {
  return typeof value === 'string' && SECTION_ID_SET.has(value);
}

/** Normalize event/action payload into SettingsOpenOptions (ignores unknown fields). */
export function normalizeSettingsOpenOptions(
  raw?: SettingsOpenOptions | null | Record<string, unknown>
): SettingsOpenOptions {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const options: SettingsOpenOptions = {};
  if (isSettingsSectionId(raw.sectionId)) {
    options.sectionId = raw.sectionId;
  }
  if (typeof raw.focus === 'string' && raw.focus.trim()) {
    options.focus = raw.focus.trim();
  }
  if (raw.density === 'simple' || raw.density === 'advanced') {
    options.density = raw.density;
  }
  return options;
}

/**
 * Apply deep-link after the settings panel is open:
 * - scroll to sectionId
 * - expand ancestor <details> for focus target (data-settings-focus or id)
 */
export function applySettingsDeepLink(
  options: SettingsOpenOptions | undefined,
  helpers: {
    scrollToSection: (sectionId: string) => void;
    setDensity?: (density: SettingsDensity) => void;
  }
): void {
  const normalized = normalizeSettingsOpenOptions(options);
  if (normalized.density && helpers.setDensity) {
    helpers.setDensity(normalized.density);
  }
  if (normalized.sectionId) {
    helpers.scrollToSection(normalized.sectionId);
  }
  if (normalized.focus) {
    expandSettingsFocusTarget(normalized.focus);
  }
}

function escapeAttrSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  // Focus ids are simple tokens (e.g. master-analysis); still escape quotes defensively.
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function expandSettingsFocusTarget(focus: string): void {
  const el =
    document.querySelector<HTMLElement>(
      `[data-settings-focus="${escapeAttrSelector(focus)}"]`
    ) || document.getElementById(focus);
  if (!el) {
    return;
  }

  let node: HTMLElement | null = el;
  while (node) {
    if (node instanceof HTMLDetailsElement) {
      node.open = true;
    }
    node = node.parentElement;
  }

  el.classList.add('settings-deep-link-highlight');
  window.setTimeout(() => {
    el.classList.remove('settings-deep-link-highlight');
  }, 2000);
}
