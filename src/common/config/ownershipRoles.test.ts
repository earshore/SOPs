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

    expect(getOwnershipRoleForModule('amz_hub')).toBe('role-hub-overview');
    expect(getPaletteForRole('role-hub-overview')).toBe('orange');

    expect(getOwnershipRoleForModule('app_center')).toBe('role-apps-overview');
    expect(getPaletteForRole('role-apps-overview')).toBe('rose');

    expect(getOwnershipRoleForModule('sops')).toBe('role-sops-overview');
    expect(getPaletteForRole('role-sops-overview')).toBe('indigo');

    expect(getOwnershipRoleForModule('home')).toBe('role-neutral');
    expect(getPaletteForRole('role-neutral')).toBe('slate');
  });

  it('keeps module role palettes aligned with menuConfig.themeColor (pure, no DOM)', () => {
    const moduleIds = [
      'keyword_hunter',
      'ppc_tools',
      'master_analysis',
      'more_core',
      'playground',
      'amz_hub',
      'app_center',
      'sops',
      'home',
    ] as const;

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

  it('soft-cross-checks Sidebar theme class for ppc_tools with ownership emerald (no production wire)', () => {
    // D8 light wire: same convention as keyword_hunter; no production coupling.
    const moduleId = 'ppc_tools';
    const roleId = getOwnershipRoleForModule(moduleId);
    const palette = getPaletteForRole(roleId!);
    const menuThemeColor = MENU_CONFIG.modules[moduleId]?.themeColor;

    expect(roleId).toBe('role-ppc');
    expect(palette).toBe('emerald');
    expect(menuThemeColor).toBe('emerald');
    expect(`sidebar-theme-${palette}`).toBe('sidebar-theme-emerald');
  });

  it('soft-cross-checks Sidebar theme class for master_analysis with ownership indigo (no production wire)', () => {
    // D8 light wire: same convention as keyword_hunter; no production coupling.
    const moduleId = 'master_analysis';
    const roleId = getOwnershipRoleForModule(moduleId);
    const palette = getPaletteForRole(roleId!);
    const menuThemeColor = MENU_CONFIG.modules[moduleId]?.themeColor;

    expect(roleId).toBe('role-analysis');
    expect(palette).toBe('indigo');
    expect(menuThemeColor).toBe('indigo');
    expect(`sidebar-theme-${palette}`).toBe('sidebar-theme-indigo');
  });

  it('soft-cross-checks Sidebar theme class for playground with ownership orange (no production wire)', () => {
    // Deep Chat is a playground child route; ownership resolves via playground module key.
    const moduleId = 'playground';
    const roleId = getOwnershipRoleForModule(moduleId);
    const palette = getPaletteForRole(roleId!);
    const menuThemeColor = MENU_CONFIG.modules[moduleId]?.themeColor;

    expect(roleId).toBe('role-playground');
    expect(palette).toBe('orange');
    expect(menuThemeColor).toBe('orange');
    expect(`sidebar-theme-${palette}`).toBe('sidebar-theme-orange');
  });

  it('soft-cross-checks Sidebar theme class for amz_hub with ownership orange (no production wire)', () => {
    // Hub overview only; hub child pages use role-hub-* categories.
    const moduleId = 'amz_hub';
    const roleId = getOwnershipRoleForModule(moduleId);
    const palette = getPaletteForRole(roleId!);
    const menuThemeColor = MENU_CONFIG.modules[moduleId]?.themeColor;

    expect(roleId).toBe('role-hub-overview');
    expect(palette).toBe('orange');
    expect(menuThemeColor).toBe('orange');
    expect(`sidebar-theme-${palette}`).toBe('sidebar-theme-orange');
  });

  it('soft-cross-checks Sidebar theme class for app_center with ownership rose (no production wire)', () => {
    const moduleId = 'app_center';
    const roleId = getOwnershipRoleForModule(moduleId);
    const palette = getPaletteForRole(roleId!);
    const menuThemeColor = MENU_CONFIG.modules[moduleId]?.themeColor;

    expect(roleId).toBe('role-apps-overview');
    expect(palette).toBe('rose');
    expect(menuThemeColor).toBe('rose');
    expect(`sidebar-theme-${palette}`).toBe('sidebar-theme-rose');
  });

  it('soft-cross-checks Sidebar theme class for sops with ownership indigo (no production wire)', () => {
    // SOPs overview only; category pages use role-ops-*.
    const moduleId = 'sops';
    const roleId = getOwnershipRoleForModule(moduleId);
    const palette = getPaletteForRole(roleId!);
    const menuThemeColor = MENU_CONFIG.modules[moduleId]?.themeColor;

    expect(roleId).toBe('role-sops-overview');
    expect(palette).toBe('indigo');
    expect(menuThemeColor).toBe('indigo');
    expect(`sidebar-theme-${palette}`).toBe('sidebar-theme-indigo');
  });

  it('soft-cross-checks hub/more category palettes with menuConfig colors (no production wire)', () => {
    // Category-level soft map only — Skills/Scraper/PromptLab are routes, not module keys.
    // hubCategories / moreCategories are typed optional on MenuConfig; runtime MENU_CONFIG defines them.
    const hubCategories = MENU_CONFIG.hubCategories;
    const moreCategories = MENU_CONFIG.moreCategories;
    expect(hubCategories).toBeDefined();
    expect(moreCategories).toBeDefined();
    if (!hubCategories || !moreCategories) {
      throw new Error(
        'MENU_CONFIG hubCategories/moreCategories required for ownership soft checks'
      );
    }

    const hubKnowledge = hubCategories.knowledge;
    const hubPractice = hubCategories.practice;
    const hubAdvanced = hubCategories.advanced;
    const moreBusiness = moreCategories.business_scenarios;
    const moreExplore = moreCategories.explore;
    expect(hubKnowledge).toBeDefined();
    expect(hubPractice).toBeDefined();
    expect(hubAdvanced).toBeDefined();
    expect(moreBusiness).toBeDefined();
    expect(moreExplore).toBeDefined();
    if (!hubKnowledge || !hubPractice || !hubAdvanced || !moreBusiness || !moreExplore) {
      throw new Error('MENU_CONFIG hub/more category entries required for ownership soft checks');
    }

    expect(getOwnershipRoleForCategory('hub', 'knowledge')).toBe('role-hub-knowledge');
    expect(getPaletteForRole('role-hub-knowledge')).toBe(hubKnowledge.color);
    expect(getPaletteForRole('role-hub-knowledge')).toBe('indigo');
    expect(`sidebar-theme-${getPaletteForRole('role-hub-knowledge')}`).toBe('sidebar-theme-indigo');

    expect(getOwnershipRoleForCategory('hub', 'practice')).toBe('role-hub-practice');
    expect(getPaletteForRole('role-hub-practice')).toBe(hubPractice.color);
    expect(getPaletteForRole('role-hub-practice')).toBe('green');
    expect(`sidebar-theme-${getPaletteForRole('role-hub-practice')}`).toBe('sidebar-theme-green');

    // Hub advanced: menu rose is config authority; violet remains dual-track wb-theme alias.
    expect(getOwnershipRoleForCategory('hub', 'advanced')).toBe('role-hub-advanced');
    expect(getPaletteForRole('role-hub-advanced')).toBe(hubAdvanced.color);
    expect(getPaletteForRole('role-hub-advanced')).toBe('rose');
    expect(`sidebar-theme-${getPaletteForRole('role-hub-advanced')}`).toBe('sidebar-theme-rose');
    const hubAdvancedClasses = getWbThemeClassesForRole('role-hub-advanced');
    expect(hubAdvancedClasses).toContain('wb-theme-rose');
    expect(hubAdvancedClasses).toContain('wb-theme-violet');

    expect(getOwnershipRoleForCategory('more', 'business_scenarios')).toBe('role-more-business');
    expect(getPaletteForRole('role-more-business')).toBe(moreBusiness.color);
    expect(getPaletteForRole('role-more-business')).toBe('cyan');
    expect(`sidebar-theme-${getPaletteForRole('role-more-business')}`).toBe('sidebar-theme-cyan');

    // Skills catalog lives under more/explore → role-more-llm (violet), not a module id.
    expect(getOwnershipRoleForCategory('more', 'explore')).toBe('role-more-llm');
    expect(getPaletteForRole('role-more-llm')).toBe(moreExplore.color);
    expect(getPaletteForRole('role-more-llm')).toBe('violet');
    expect(`sidebar-theme-${getPaletteForRole('role-more-llm')}`).toBe('sidebar-theme-violet');
  });

  it('soft-cross-checks sop category palettes with menuConfig colors (no production wire)', () => {
    // SOP overview is module-level indigo; category pages use role-ops-* only.
    // sopCategories may be optional on ambient MenuConfig; runtime MENU_CONFIG defines them.
    const sopCategories = MENU_CONFIG.sopCategories;
    expect(sopCategories).toBeDefined();
    if (!sopCategories) {
      throw new Error('MENU_CONFIG sopCategories required for ownership soft checks');
    }

    const growth = sopCategories.growth;
    const backend = sopCategories.backend;
    const safety = sopCategories.safety;
    const service = sopCategories.service;
    expect(growth).toBeDefined();
    expect(backend).toBeDefined();
    expect(safety).toBeDefined();
    expect(service).toBeDefined();
    if (!growth || !backend || !safety || !service) {
      throw new Error('MENU_CONFIG sop category entries required for ownership soft checks');
    }

    expect(getOwnershipRoleForCategory('sop', 'growth')).toBe('role-ops-growth');
    expect(getPaletteForRole('role-ops-growth')).toBe(growth.color);
    expect(getPaletteForRole('role-ops-growth')).toBe('emerald');
    expect(`sidebar-theme-${getPaletteForRole('role-ops-growth')}`).toBe('sidebar-theme-emerald');
    expect(getWbThemeClassesForRole('role-ops-growth')).toContain('wb-theme-growth');

    expect(getOwnershipRoleForCategory('sop', 'backend')).toBe('role-ops-supply');
    expect(getPaletteForRole('role-ops-supply')).toBe(backend.color);
    expect(getPaletteForRole('role-ops-supply')).toBe('amber');
    expect(`sidebar-theme-${getPaletteForRole('role-ops-supply')}`).toBe('sidebar-theme-amber');
    expect(getWbThemeClassesForRole('role-ops-supply')).toContain('wb-theme-supply');

    expect(getOwnershipRoleForCategory('sop', 'safety')).toBe('role-ops-safety');
    expect(getPaletteForRole('role-ops-safety')).toBe(safety.color);
    expect(getPaletteForRole('role-ops-safety')).toBe('red');
    expect(`sidebar-theme-${getPaletteForRole('role-ops-safety')}`).toBe('sidebar-theme-red');
    expect(getWbThemeClassesForRole('role-ops-safety')).toContain('wb-theme-safety');

    expect(getOwnershipRoleForCategory('sop', 'service')).toBe('role-ops-service');
    expect(getPaletteForRole('role-ops-service')).toBe(service.color);
    expect(getPaletteForRole('role-ops-service')).toBe('teal');
    expect(`sidebar-theme-${getPaletteForRole('role-ops-service')}`).toBe('sidebar-theme-teal');
    const serviceClasses = getWbThemeClassesForRole('role-ops-service');
    expect(serviceClasses).toContain('wb-theme-service');
    expect(serviceClasses).toContain('wb-theme-teal');
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
