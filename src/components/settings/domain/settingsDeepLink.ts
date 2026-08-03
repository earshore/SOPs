// src/components/settings/domain/settingsDeepLink.ts
// Deep-link options for system settings open (section scroll + focus expand).

import type { SettingsOpenOptions, SettingsSectionId } from '../settingsOpenOptions';
export type { SettingsOpenOptions, SettingsSectionId } from '../settingsOpenOptions';

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

/**
 * Prefer fold/card markers over bare title ids so nav scroll + highlight
 * land on a real content surface (not an h4 outline).
 */
export function findSettingsNavTarget(targetId: string): HTMLElement | null {
  if (!targetId) return null;
  const escaped = escapeAttrSelector(targetId);
  return (
    document.querySelector<HTMLElement>(`[data-settings-focus="${escaped}"]`) ||
    document.querySelector<HTMLElement>(`[data-settings-nav-id="${escaped}"]`) ||
    document.getElementById(targetId)
  );
}

/** Surfaces large enough for a calm focus ring (nav / deep-link highlight). */
const HIGHLIGHT_SURFACE_SELECTOR = [
  '.settings-pref-fold',
  '.settings-tool-l3',
  '.settings-pref-row',
  '.settings-card',
  '.settings-tool-page',
  '.settings-section-frame',
  '.settings-pref-list',
  '.settings-panel-section',
].join(', ');

/**
 * Promote a title / control hit to the nearest card-like container so the
 * highlight box is one coherent block instead of a messy outline on text.
 *
 * L3 modules (数据采集 / AI 智能分析 …): always the whole
 * `.settings-tool-l3` (title strip + body), never body-only.
 */
export function resolveSettingsHighlightTarget(el: HTMLElement): HTMLElement {
  const l3 = el.matches('.settings-tool-l3') ? el : el.closest<HTMLElement>('.settings-tool-l3');
  if (l3) {
    return l3;
  }

  if (el.matches(HIGHLIGHT_SURFACE_SELECTOR)) {
    return el;
  }
  return el.closest<HTMLElement>(HIGHLIGHT_SURFACE_SELECTOR) ?? el;
}

const HIGHLIGHT_CLASS = 'settings-deep-link-highlight';
const HIGHLIGHT_MS = 1600;
let highlightClearTimer: number | null = null;

/** Remove any active nav/deep-link highlight (and its clear timer). */
export function clearSettingsDeepLinkHighlight(): void {
  if (highlightClearTimer != null) {
    window.clearTimeout(highlightClearTimer);
    highlightClearTimer = null;
  }
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(node => {
    node.classList.remove(HIGHLIGHT_CLASS);
  });
}

function applySettingsDeepLinkHighlight(surface: HTMLElement): void {
  clearSettingsDeepLinkHighlight();
  // Restart CSS animation when clicking the same target again.
  void surface.offsetWidth;
  surface.classList.add(HIGHLIGHT_CLASS);
  highlightClearTimer = window.setTimeout(() => {
    surface.classList.remove(HIGHLIGHT_CLASS);
    highlightClearTimer = null;
  }, HIGHLIGHT_MS);
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

  const surface = resolveSettingsHighlightTarget(el);
  applySettingsDeepLinkHighlight(surface);
  return surface;
}
