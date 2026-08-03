import { describe, expect, it, vi } from 'vitest';
import { readSettingsStyles, readSettingsTemplate } from './settingsTemplateAssembly';
import {
  findFirstSettingsSearchMatch,
  findSettingsSearchMatches,
  pickSettingsSearchHitTitle,
  SETTINGS_SEARCH_INDEX,
  toSettingsSearchHitViews,
} from '@/components/settings/domain/settingsSearch';
import {
  applySettingsDeepLink,
  findSettingsNavTarget,
  resolveSettingsNavGroupFromSection,
} from '@/components/settings/domain/settingsDeepLink';

describe('settingsSearch', () => {
  it('UT-P1-05 query ACOS hits PPC thresholds focus id', () => {
    const hit = findFirstSettingsSearchMatch('ACOS');
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe('ppc-thresholds');
    expect(hit?.sectionId).toBe('settings-section-tool-strategy');
  });

  it('UT-P1-05 empty query returns null', () => {
    expect(findFirstSettingsSearchMatch('   ')).toBeNull();
  });

  it('UT-P1-05 index covers key sections', () => {
    expect(SETTINGS_SEARCH_INDEX.some(e => e.sectionId === 'settings-section-llm')).toBe(true);
    expect(SETTINGS_SEARCH_INDEX.some(e => e.sectionId === 'settings-section-tool-strategy')).toBe(
      true
    );
  });

  it('ranks exact/prefix hits above loose substring', () => {
    const hit = findFirstSettingsSearchMatch('凭证');
    expect(hit?.id).toBe('llm-step-2-title');
  });

  it('returns ranked multi-matches for shared labels', () => {
    const hits = findSettingsSearchMatches('Deep Chat', SETTINGS_SEARCH_INDEX, 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.id).toBe('playground-deep-chat');
  });

  it('builds human hit views for multi-result UI', () => {
    const views = toSettingsSearchHitViews(
      findSettingsSearchMatches('Deep Chat', SETTINGS_SEARCH_INDEX, 3)
    );
    expect(views[0]?.title).toMatch(/Deep Chat|Playground/);
    expect(views[0]?.sectionLabel).toBe('工具策略');
    expect(pickSettingsSearchHitTitle(SETTINGS_SEARCH_INDEX[0]!)).toBeTruthy();
  });

  it('covers nav-aligned targets including presets and cleanup', () => {
    const ids = SETTINGS_SEARCH_INDEX.map(e => e.id);
    expect(ids).toContain('settings-runtime-presets');
    expect(ids).toContain('settings-data-cleanup-items');
    expect(ids).toContain('playground-deep-chat');
    expect(ids).toContain('settings-appearance-color-mode');
    expect(ids).toContain('master-analysis-scrape');
  });

  it('routes tool and appearance leaf searches to their own navigation targets', () => {
    expect(findFirstSettingsSearchMatch('SEO 处理')?.id).toBe('keyword-hunter-seo-process');
    expect(findFirstSettingsSearchMatch('Listing 评审')?.id).toBe('keyword-hunter-listing-review');
    expect(findFirstSettingsSearchMatch('界面动画')?.id).toBe('settings-appearance-animation');
    expect(findFirstSettingsSearchMatch('动画与动效')?.id).toBe(
      'settings-appearance-animation'
    );
    expect(findFirstSettingsSearchMatch('减少动效')?.id).toBe('settings-appearance-reduced-motion');
    expect(findFirstSettingsSearchMatch('动画速度')?.id).toBe(
      'settings-appearance-animation-speed'
    );
  });
});

describe('settings deep-link target resolve', () => {
  it('maps section ids to nav groups', () => {
    expect(resolveSettingsNavGroupFromSection('settings-section-llm')).toBe('llm');
    expect(resolveSettingsNavGroupFromSection('settings-section-network')).toBe('tool');
    expect(resolveSettingsNavGroupFromSection('settings-section-performance')).toBe('dev');
  });

  it('finds targets by data-settings-nav-id', () => {
    document.body.innerHTML = `
      <div data-settings-nav-id="settings-appearance-theme" data-settings-nav-group="appearance"></div>
    `;
    expect(
      findSettingsNavTarget('settings-appearance-theme')?.getAttribute('data-settings-nav-id')
    ).toBe('settings-appearance-theme');
  });
});

describe('deep link helper (no density)', () => {
  it('applySettingsDeepLink scrolls section without density', () => {
    const scroll = vi.fn();
    applySettingsDeepLink(
      { sectionId: 'settings-section-tool-strategy', focus: 'ppc-thresholds' },
      { scrollToSection: scroll }
    );
    expect(scroll).toHaveBeenCalledWith('settings-section-tool-strategy');
  });
});

describe('CT-P1-02 / CT-P1-03 template contracts', () => {
  const html = readSettingsTemplate();
  const css = readSettingsStyles();

  function readTemplateFragment(): DocumentFragment {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content;
  }

  it('CT-P1-02 has search toolbar without density mode', () => {
    expect(html).toContain('settings-search');
    expect(html).toContain('data-testid="settings-search"');
    expect(html).toContain('data-testid="settings-search-results"');
    expect(html).toContain('selectSettingsSearchHit(');
    expect(html).toContain('settings-toolbar--search-only');
    expect(html).not.toContain('settings-density-simple');
    expect(html).not.toContain('settings-density-advanced');
    expect(html).not.toContain('data-settings-density=');
    expect(html).not.toContain('settingsDensity');
    expect(css).toContain('.settings-search');
    expect(css).toContain('.settings-search-results');
    expect(css).toContain('.settings-segmented');
  });

  it('CT-P1-03 template includes impact scope badge copy', () => {
    expect(html).toContain('影响 AI 成本');
    expect(html).toContain('影响采集');
    expect(html).toContain('破坏性');
    expect(html).toContain('即时生效');
    expect(html).toContain('settings-badge');
    expect(css).toContain('.settings-badge--ai-cost');
  });

  it('nests Master Analysis and Keyword Hunter leaves as third-level navigation', () => {
    const fragment = readTemplateFragment();
    const master = fragment.querySelector('[data-testid="settings-nav-master-analysis"]');
    const masterScrape = fragment.querySelector(
      '[data-testid="settings-nav-master-analysis-scrape"]'
    );
    const masterAi = fragment.querySelector('[data-testid="settings-nav-master-analysis-ai"]');
    const keywordHunter = fragment.querySelector('[data-testid="settings-nav-keyword-hunter"]');
    const keywordSeo = fragment.querySelector(
      '[data-testid="settings-nav-keyword-hunter-seo-process"]'
    );
    const keywordListing = fragment.querySelector(
      '[data-testid="settings-nav-keyword-hunter-listing-review"]'
    );

    for (const target of [
      master,
      masterScrape,
      masterAi,
      keywordHunter,
      keywordSeo,
      keywordListing,
    ]) {
      expect(target).not.toBeNull();
    }
    expect(masterScrape?.classList.contains('settings-panel-nav-link--tertiary')).toBe(true);
    expect(masterAi?.classList.contains('settings-panel-nav-link--tertiary')).toBe(true);
    expect(keywordSeo?.classList.contains('settings-panel-nav-link--tertiary')).toBe(true);
    expect(keywordListing?.classList.contains('settings-panel-nav-link--tertiary')).toBe(true);
    expect(
      masterScrape?.parentElement?.classList.contains('settings-panel-nav-subgroup-children')
    ).toBe(true);
    expect(
      keywordSeo?.parentElement?.classList.contains('settings-panel-nav-subgroup-children')
    ).toBe(true);

    for (const id of [
      'keyword-hunter-seo-process',
      'keyword-hunter-listing-review',
      'settings-appearance-animation',
      'settings-appearance-reduced-motion',
      'settings-appearance-animation-speed',
    ]) {
      expect(fragment.querySelector(`[data-settings-nav-id="${id}"]`)).not.toBeNull();
    }
    expect(css).toContain('.settings-panel-nav-link--tertiary');
  });

  it('uses the tone row itself as the appearance theme deep-link surface', () => {
    const fragment = readTemplateFragment();
    const tone = fragment.querySelector('#settings-appearance-theme');
    const preferenceList = tone?.closest('.settings-pref-list');

    expect(tone?.classList.contains('settings-pref-row')).toBe(true);
    expect(tone?.getAttribute('data-testid')).toBe('settings-appearance-theme');
    expect(tone?.getAttribute('data-settings-nav-id')).toBe('settings-appearance-theme');
    expect(preferenceList?.id).toBe('');
    expect(preferenceList?.getAttribute('data-settings-nav-id')).toBeNull();
  });
});
