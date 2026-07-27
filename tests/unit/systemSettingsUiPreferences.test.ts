import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  findFirstSettingsSearchMatch,
  findSettingsSearchMatches,
  SETTINGS_SEARCH_INDEX,
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

  it('covers nav-aligned targets including presets and cleanup', () => {
    const ids = SETTINGS_SEARCH_INDEX.map(e => e.id);
    expect(ids).toContain('settings-runtime-presets');
    expect(ids).toContain('settings-data-cleanup-items');
    expect(ids).toContain('playground-deep-chat');
    expect(ids).toContain('settings-appearance-color-mode');
    expect(ids).toContain('master-analysis-scrape');
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
    expect(findSettingsNavTarget('settings-appearance-theme')?.getAttribute('data-settings-nav-id')).toBe(
      'settings-appearance-theme'
    );
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
  const html = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.html'),
    'utf8'
  );
  const css = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.css'),
    'utf8'
  );

  it('CT-P1-02 has search toolbar without density mode', () => {
    expect(html).toContain('settings-search');
    expect(html).toContain('data-testid="settings-search"');
    expect(html).toContain('settings-toolbar--search-only');
    expect(html).not.toContain('settings-density-simple');
    expect(html).not.toContain('settings-density-advanced');
    expect(html).not.toContain('data-settings-density=');
    expect(html).not.toContain('settingsDensity');
    expect(css).toContain('.settings-search');
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
});
