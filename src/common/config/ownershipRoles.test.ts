import { describe, expect, it } from 'vitest';
import { MENU_CONFIG } from './menuConfig';
import {
  OWNERSHIP_ROLE_IDS,
  OWNERSHIP_ROLES,
  getOwnershipRole,
  getOwnershipRoleForCategory,
  getOwnershipRoleForModule,
  getPaletteForRole,
  getWbThemeClassesForRole,
  isOwnershipRoleId,
  type OwnershipRoleId,
} from './ownershipRoles';

describe('ownershipRoles SSOT (D8 scaffold)', () => {
  it('defines exactly 19 ownership roles', () => {
    expect(OWNERSHIP_ROLE_IDS).toHaveLength(19);
    expect(Object.keys(OWNERSHIP_ROLES)).toHaveLength(19);
  });

  it('keeps every table entry id aligned with its key', () => {
    for (const id of OWNERSHIP_ROLE_IDS) {
      expect(OWNERSHIP_ROLES[id].id).toBe(id);
    }
  });

  it('maps known modules to roles and palettes', () => {
    expect(getOwnershipRoleForModule('keyword_hunter')).toBe('role-keywords');
    expect(getPaletteForRole('role-keywords')).toBe('rose');

    expect(getOwnershipRoleForModule('ppc_tools')).toBe('role-ppc');
    expect(getPaletteForRole('role-ppc')).toBe('emerald');

    expect(getOwnershipRoleForModule('master_analysis')).toBe('role-analysis');
    expect(getPaletteForRole('role-analysis')).toBe('indigo');

    expect(getOwnershipRoleForModule('playground')).toBe('role-playground');
    expect(getPaletteForRole('role-playground')).toBe('orange');

    expect(getOwnershipRoleForModule('more_core')).toBe('role-more-overview');
    expect(getPaletteForRole('role-more-overview')).toBe('green');
  });

  it('keeps module role palettes aligned with menuConfig.themeColor (pure, no DOM)', () => {
    const moduleIds = ['keyword_hunter', 'ppc_tools', 'master_analysis', 'more_core'] as const;

    for (const moduleId of moduleIds) {
      const roleId = getOwnershipRoleForModule(moduleId);
      expect(roleId).not.toBeNull();
      expect(getPaletteForRole(roleId!)).toBe(MENU_CONFIG.modules[moduleId]?.themeColor);
    }
  });

  it('soft-cross-checks Sidebar theme class for keyword_hunter with ownership rose (no production wire)', () => {
    // D8 light wire: assert the convention SidebarRenderer uses
    // (`sidebar-theme-${ColorSchemeName}`) matches ownershipRoles palette when
    // menu themeColor and role palette agree. Does not import SidebarRenderer /
    // ColorContext to avoid production coupling; next optional wire: SidebarRenderer.
    const moduleId = 'keyword_hunter';
    const roleId = getOwnershipRoleForModule(moduleId);
    const palette = getPaletteForRole(roleId!);
    const menuThemeColor = MENU_CONFIG.modules[moduleId]?.themeColor;

    expect(roleId).toBe('role-keywords');
    expect(palette).toBe('rose');
    expect(menuThemeColor).toBe('rose');
    expect(`sidebar-theme-${palette}`).toBe('sidebar-theme-rose');
  });

  it('returns null for unknown modules and roles (no fake defaults)', () => {
    expect(getOwnershipRoleForModule('not_a_module')).toBeNull();
    expect(getOwnershipRole('role-does-not-exist')).toBeNull();
    expect(getPaletteForRole('role-does-not-exist')).toBeNull();
    expect(isOwnershipRoleId('role-keywords')).toBe(true);
    expect(isOwnershipRoleId('role-nope')).toBe(false);
  });

  it('exposes shell settings without a business palette', () => {
    const settings = getOwnershipRole('role-sys-settings');
    expect(settings?.palette).toBeNull();
    expect(getPaletteForRole('role-sys-settings')).toBeNull();
    expect(getWbThemeClassesForRole('role-sys-settings')).toEqual([]);
  });

  it('maps menu categories without inventing roles', () => {
    expect(getOwnershipRoleForCategory('sop', 'growth')).toBe('role-ops-growth');
    expect(getPaletteForRole('role-ops-growth')).toBe('emerald');
    expect(getOwnershipRoleForCategory('hub', 'advanced')).toBe('role-hub-advanced');
    expect(getPaletteForRole('role-hub-advanced')).toBe('rose');
    expect(getOwnershipRoleForCategory('more', 'explore')).toBe('role-more-llm');
    expect(getPaletteForRole('role-more-llm')).toBe('violet');
    expect(getOwnershipRoleForCategory('sop', 'unknown')).toBeNull();
  });

  it('lists preferred wb-theme classes for dual-track roles', () => {
    const keywordsClasses = getWbThemeClassesForRole('role-keywords');
    expect(keywordsClasses).toContain('wb-theme-rose');
    expect(keywordsClasses).toContain('wb-theme-fuchsia');

    // PPC: custom hero, no mandatory single class
    expect(getWbThemeClassesForRole('role-ppc')).toEqual([]);
  });

  it('covers every OwnershipRoleId key in the const map (type exhaustiveness smoke)', () => {
    const required: OwnershipRoleId[] = [
      'role-neutral',
      'role-sops-overview',
      'role-ops-growth',
      'role-ops-supply',
      'role-ops-safety',
      'role-ops-service',
      'role-apps-overview',
      'role-analysis',
      'role-playground',
      'role-keywords',
      'role-ppc',
      'role-hub-overview',
      'role-hub-knowledge',
      'role-hub-practice',
      'role-hub-advanced',
      'role-more-overview',
      'role-more-llm',
      'role-more-business',
      'role-sys-settings',
    ];
    expect(new Set(OWNERSHIP_ROLE_IDS)).toEqual(new Set(required));
  });
});
