import { describe, expect, it } from 'vitest';
import {
  buildSettingsNavScrollItems,
  measureSettingsNavMarkers,
  pickActiveSettingsNavGroup,
  pickActiveSettingsNavId,
} from '@/components/settings/domain/settingsNavScroll';

describe('settingsNavScroll helpers (TD-SET-04)', () => {
  const items = buildSettingsNavScrollItems([
    { id: 'settings-section-llm', groupId: 'llm', offsetTop: 0 },
    { id: 'general-ai-runtime', groupId: 'tool', offsetTop: 400 },
    { id: 'keyword-hunter', groupId: 'tool', offsetTop: 900 },
    { id: 'settings-section-data', groupId: 'data', offsetTop: 1400 },
  ]);

  it('picks the last marker at or above the sticky scan line', () => {
    expect(pickActiveSettingsNavId(items, 0, 48)).toBe('settings-section-llm');
    expect(pickActiveSettingsNavId(items, 360, 48)).toBe('general-ai-runtime');
    expect(pickActiveSettingsNavId(items, 880, 48)).toBe('keyword-hunter');
    expect(pickActiveSettingsNavId(items, 1500, 48)).toBe('settings-section-data');
  });

  it('returns null for empty input', () => {
    expect(pickActiveSettingsNavId([], 0)).toBeNull();
  });

  it('resolves group for active id', () => {
    expect(pickActiveSettingsNavGroup(items, 'keyword-hunter')).toBe('tool');
    expect(pickActiveSettingsNavGroup(items, null)).toBeNull();
  });

  it('measureSettingsNavMarkers uses real DOM marker attributes', () => {
    document.body.innerHTML = `
      <div class="settings-panel-scroll" style="position:relative;height:200px;overflow:auto">
        <div data-settings-nav-id="a" data-settings-nav-group="g1" style="height:100px"></div>
        <div data-settings-nav-id="b" data-settings-nav-group="g2" style="height:100px"></div>
      </div>
    `;
    const scroller = document.querySelector('.settings-panel-scroll') as HTMLElement;
    const measured = measureSettingsNavMarkers(
      scroller,
      scroller.querySelectorAll('[data-settings-nav-id]')
    );
    expect(measured.map((m) => m.id)).toEqual(['a', 'b']);
    expect(measured.map((m) => m.groupId)).toEqual(['g1', 'g2']);
    expect(measured.every((m) => Number.isFinite(m.offsetTop))).toBe(true);
  });
});
