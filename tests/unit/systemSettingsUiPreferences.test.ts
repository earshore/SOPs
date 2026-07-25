import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  findFirstSettingsSearchMatch,
  SETTINGS_SEARCH_INDEX,
} from '@/components/settings/domain/settingsSearch';
import { applySettingsDeepLink } from '@/components/settings/domain/settingsDeepLink';

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
