/**
 * ownershipRoles.ts — Ownership Role → palette / wb-theme code SSOT (D8 light scaffold).
 *
 * Layer B (Module Ownership) only. See:
 * - docs/superpowers/plans/2026-07-26-ownership-role-palette-map.md (full table)
 * - docs/THEME_SYSTEM_GUIDELINES.md §2.2 / §3
 *
 * Contracts:
 * - Pure data + pure helpers. No DOM writes, no ThemeManager, no Appearance.
 * - Appearance (Layer A) must never rewrite this table or call paths that mutate it.
 * - Does NOT bind templates with data-ownership-role (Phase 4 optional, not this file).
 * - menuConfig remains the live menu color source; this table is the role naming SSOT.
 */

import type { ColorSchemeName } from '../constants/colorSchemes';

/** Stable business ownership role ids (19). Grow only via Role map + review. */
export type OwnershipRoleId =
  | 'role-neutral'
  | 'role-sops-overview'
  | 'role-ops-growth'
  | 'role-ops-supply'
  | 'role-ops-safety'
  | 'role-ops-service'
  | 'role-apps-overview'
  | 'role-analysis'
  | 'role-playground'
  | 'role-keywords'
  | 'role-ppc'
  | 'role-hub-overview'
  | 'role-hub-knowledge'
  | 'role-hub-practice'
  | 'role-hub-advanced'
  | 'role-more-overview'
  | 'role-more-llm'
  | 'role-more-business'
  | 'role-sys-settings';

/**
 * Default palette for a role.
 * `null` = shell / Appearance-only (no business ownership color).
 */
export type OwnershipPalette = ColorSchemeName | null;

export interface OwnershipRoleDefinition {
  id: OwnershipRoleId;
  /** Default palette name (menu / colorSchemes aligned). */
  palette: OwnershipPalette;
  /** Optional menuConfig pointer for humans / review. */
  menuSource?: string;
  /** Preferred + legacy compatible welcome-banner classes. */
  wbThemeClasses?: readonly string[];
  /** Exceptions / dual-track notes (do not invent new semantics here). */
  notes?: string;
}

/**
 * Role → palette / wb-theme SSOT table (19 roles).
 * Source of truth for role ids; palette authority still defers to menuConfig when they conflict.
 */
export const OWNERSHIP_ROLES: Readonly<Record<OwnershipRoleId, OwnershipRoleDefinition>> = {
  'role-neutral': {
    id: 'role-neutral',
    palette: 'slate',
    menuSource: 'modules.home.themeColor: slate',
    wbThemeClasses: ['wb-theme-neutral'],
    notes: 'Home / neutral shell. System settings shell prefers Appearance, not this role.',
  },
  'role-sops-overview': {
    id: 'role-sops-overview',
    palette: 'indigo',
    menuSource: 'modules.sops.themeColor: indigo',
    wbThemeClasses: ['wb-theme-indigo'],
    notes: 'Overview only; category pages use role-ops-*.',
  },
  'role-ops-growth': {
    id: 'role-ops-growth',
    palette: 'emerald',
    menuSource: 'sopCategories.growth.color: emerald',
    wbThemeClasses: ['wb-theme-growth'],
  },
  'role-ops-supply': {
    id: 'role-ops-supply',
    palette: 'amber',
    menuSource: 'sopCategories.backend.color: amber',
    wbThemeClasses: ['wb-theme-supply'],
  },
  'role-ops-safety': {
    id: 'role-ops-safety',
    palette: 'red',
    menuSource: 'sopCategories.safety.color: red',
    wbThemeClasses: ['wb-theme-safety'],
  },
  'role-ops-service': {
    id: 'role-ops-service',
    palette: 'teal',
    menuSource: 'sopCategories.service.color: teal',
    wbThemeClasses: ['wb-theme-service', 'wb-theme-teal'],
    notes: 'Prefer wb-theme-service on new pages; teal is legacy alias.',
  },
  'role-apps-overview': {
    id: 'role-apps-overview',
    palette: 'rose',
    menuSource: 'modules.app_center.themeColor: rose',
    wbThemeClasses: ['wb-theme-rose'],
    notes: 'Overview may also use --app-overview-* local tokens.',
  },
  'role-analysis': {
    id: 'role-analysis',
    palette: 'indigo',
    menuSource: 'modules.master_analysis.themeColor + appCategories.master_analysis.color: indigo',
    wbThemeClasses: ['wb-theme-indigo', 'wb-theme-analytics'],
    notes: 'wb-theme-analytics is legacy blue variant; do not use on new pages.',
  },
  'role-playground': {
    id: 'role-playground',
    palette: 'orange',
    menuSource: 'modules.playground.themeColor / appCategories.playground.color: orange',
    wbThemeClasses: ['wb-theme-supply'],
    notes:
      'Config orange vs implementation terracotta dual exception. Do not add wb-theme-orange this phase.',
  },
  'role-keywords': {
    id: 'role-keywords',
    palette: 'rose',
    menuSource: 'modules.keyword_hunter.themeColor + appCategories.keyword_hunter.color: rose',
    wbThemeClasses: ['wb-theme-rose', 'wb-theme-fuchsia'],
    notes: 'Menu rose vs banner fuchsia dual-track; new pages prefer rose + wb-theme-rose.',
  },
  'role-ppc': {
    id: 'role-ppc',
    palette: 'emerald',
    menuSource: 'modules.ppc_tools.themeColor + appCategories.ppc_tools.color: emerald',
    notes: 'Custom PPC hero + --ppc-* local tokens; no mandatory single wb-theme-*.',
  },
  'role-hub-overview': {
    id: 'role-hub-overview',
    palette: 'orange',
    menuSource: 'modules.amz_hub.themeColor: orange',
    notes: 'Overview only; hub child pages use role-hub-*.',
  },
  'role-hub-knowledge': {
    id: 'role-hub-knowledge',
    palette: 'indigo',
    menuSource: 'hubCategories.knowledge.color: indigo',
    wbThemeClasses: ['wb-theme-indigo'],
  },
  'role-hub-practice': {
    id: 'role-hub-practice',
    palette: 'green',
    menuSource: 'hubCategories.practice.color: green',
    wbThemeClasses: ['wb-theme-growth'],
    notes: 'Class name growth is historical; palette is menu green.',
  },
  'role-hub-advanced': {
    id: 'role-hub-advanced',
    palette: 'rose',
    menuSource: 'hubCategories.advanced.color: rose',
    wbThemeClasses: ['wb-theme-rose', 'wb-theme-violet'],
    notes: 'Menu rose vs common violet drift; menu rose is config authority.',
  },
  'role-more-overview': {
    id: 'role-more-overview',
    palette: 'green',
    menuSource: 'modules.more_core.themeColor: green',
    notes: 'Overview only; child pages use role-more-*.',
  },
  'role-more-llm': {
    id: 'role-more-llm',
    palette: 'violet',
    menuSource: 'moreCategories.explore.color: violet',
    wbThemeClasses: ['wb-theme-violet', 'wb-theme-more-agents'],
  },
  'role-more-business': {
    id: 'role-more-business',
    palette: 'cyan',
    menuSource: 'moreCategories.business_scenarios.color: cyan',
    wbThemeClasses: ['wb-theme-cyan'],
  },
  'role-sys-settings': {
    id: 'role-sys-settings',
    palette: null,
    menuSource: 'contexts.sys (no business category color)',
    notes: 'Appearance + Color Mode only; never bind business wb-theme-* on settings shell.',
  },
} as const;

/** Ordered list of all role ids (stable for tests / iteration). */
export const OWNERSHIP_ROLE_IDS: readonly OwnershipRoleId[] = Object.keys(
  OWNERSHIP_ROLES
) as OwnershipRoleId[];

/**
 * Best-effort moduleId → overview/module role.
 * Category-level roles (ops-*, hub-*, more-*) are not resolved here —
 * callers with a category should use {@link getOwnershipRoleForCategory}.
 */
const MODULE_OWNERSHIP_ROLES: Readonly<Record<string, OwnershipRoleId>> = {
  home: 'role-neutral',
  sops: 'role-sops-overview',
  app_center: 'role-apps-overview',
  master_analysis: 'role-analysis',
  playground: 'role-playground',
  keyword_hunter: 'role-keywords',
  ppc_tools: 'role-ppc',
  amz_hub: 'role-hub-overview',
  more_core: 'role-more-overview',
};

/** Category domain → categoryId → role (menuConfig category bags). */
const CATEGORY_OWNERSHIP_ROLES: Readonly<
  Record<'sop' | 'hub' | 'more' | 'app', Readonly<Record<string, OwnershipRoleId>>>
> = {
  sop: {
    growth: 'role-ops-growth',
    backend: 'role-ops-supply',
    safety: 'role-ops-safety',
    service: 'role-ops-service',
  },
  hub: {
    knowledge: 'role-hub-knowledge',
    practice: 'role-hub-practice',
    advanced: 'role-hub-advanced',
  },
  more: {
    explore: 'role-more-llm',
    business_scenarios: 'role-more-business',
  },
  app: {
    master_analysis: 'role-analysis',
    playground: 'role-playground',
    keyword_hunter: 'role-keywords',
    ppc_tools: 'role-ppc',
  },
};

export function isOwnershipRoleId(value: string): value is OwnershipRoleId {
  return Object.prototype.hasOwnProperty.call(OWNERSHIP_ROLES, value);
}

export function getOwnershipRole(roleId: string): OwnershipRoleDefinition | null {
  if (!isOwnershipRoleId(roleId)) {
    return null;
  }
  return OWNERSHIP_ROLES[roleId];
}

/**
 * Resolve default palette for a role id.
 * Returns null for unknown roles and for shell-only roles (e.g. settings).
 */
export function getPaletteForRole(roleId: string): OwnershipPalette {
  return getOwnershipRole(roleId)?.palette ?? null;
}

/**
 * Preferred wb-theme class list for a role (may be empty).
 * Does not invent classes; empty means custom hero / no single banner class.
 */
export function getWbThemeClassesForRole(roleId: string): readonly string[] {
  return getOwnershipRole(roleId)?.wbThemeClasses ?? [];
}

/**
 * Best-effort ownership role for a menu module id.
 * Overview/app modules only; returns null when unknown (no default fake role).
 */
export function getOwnershipRoleForModule(moduleId: string): OwnershipRoleId | null {
  return MODULE_OWNERSHIP_ROLES[moduleId] ?? null;
}

/**
 * Ownership role for a known menu category id within a domain bag.
 */
export function getOwnershipRoleForCategory(
  domain: 'sop' | 'hub' | 'more' | 'app',
  categoryId: string
): OwnershipRoleId | null {
  return CATEGORY_OWNERSHIP_ROLES[domain]?.[categoryId] ?? null;
}
