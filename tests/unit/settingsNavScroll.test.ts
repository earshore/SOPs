import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

  it('returns null when scan line is still above the first marker (no false mid-page hit)', () => {
    // Only mid-page markers exist (e.g. tool secondaries without LLM section marker).
    const midOnly = buildSettingsNavScrollItems([
      { id: 'general-ai-runtime', groupId: 'tool', offsetTop: 400 },
      { id: 'keyword-hunter', groupId: 'tool', offsetTop: 900 },
    ]);
    expect(pickActiveSettingsNavId(midOnly, 0, 48)).toBeNull();
    expect(pickActiveSettingsNavId(midOnly, 100, 48)).toBeNull();
    // Once past first marker, highlight it
    expect(pickActiveSettingsNavId(midOnly, 360, 48)).toBe('general-ai-runtime');
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
    expect(measured.map(m => m.id)).toEqual(['a', 'b']);
    expect(measured.map(m => m.groupId)).toEqual(['g1', 'g2']);
    expect(measured.every(m => Number.isFinite(m.offsetTop))).toBe(true);
  });

  it('shipped settings HTML wires is-current + markers for every nav target group', () => {
    const html = readFileSync(
      resolve(process.cwd(), 'src/components/settings/systemSettings.html'),
      'utf8'
    );
    const targets = [
      'settings-section-llm',
      'llm-step-1-title',
      'llm-step-2-title',
      'llm-step-3-title',
      'llm-step-4-title',
      'settings-section-tool-strategy',
      'general-ai-runtime',
      'keyword-hunter',
      'ppc-analysis-flags',
      'settings-section-data',
      'settings-export-buckets',
      'settings-data-retention',
      'settings-data-danger',
      'settings-section-appearance',
      'settings-appearance-theme',
      'settings-appearance-animation',
      'settings-section-performance',
    ];
    for (const id of targets) {
      expect(html, `missing is-current for ${id}`).toContain(`isNavTargetCurrent('${id}')`);
      expect(html, `missing data-settings-nav-id for ${id}`).toContain(
        `data-settings-nav-id="${id}"`
      );
    }
  });
});
