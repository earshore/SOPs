// src/components/settings/domain/settingsDeepLink.ts
// Deep-link options for system settings open (section scroll + focus expand).

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
  }
): void {
  const normalized = normalizeSettingsOpenOptions(options);
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
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Map a settings section id to side-nav group id (llm|tool|data|appearance|dev). */
export function resolveSettingsNavGroupFromSection(sectionId: string): string | null {
  switch (sectionId) {
    case 'settings-section-llm':
      return 'llm';
    case 'settings-section-tool-strategy':
    case 'settings-section-network':
      return 'tool';
    case 'settings-section-data':
      return 'data';
    case 'settings-section-appearance':
      return 'appearance';
    case 'settings-section-performance':
      return 'dev';
    default:
      return null;
  }
}

/** Resolve a settings target by id, focus marker, or nav marker. */
export function findSettingsNavTarget(targetId: string): HTMLElement | null {
  if (!targetId) return null;
  const escaped = escapeAttrSelector(targetId);
  return (
    document.getElementById(targetId) ||
    document.querySelector<HTMLElement>(`[data-settings-focus="${escaped}"]`) ||
    document.querySelector<HTMLElement>(`[data-settings-nav-id="${escaped}"]`)
  );
}

/** Open all ancestor <details> for a target (nav secondary / deep-link). */
export function expandSettingsFocusTarget(focus: string): HTMLElement | null {
  const el = findSettingsNavTarget(focus);
  if (!el) {
    return null;
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

  return el;
}
