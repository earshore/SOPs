import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initAlpineSettings } from '@/components/settings/systemSettings';

interface SettingsPanelForTest {
  llm: {
    provider: string;
    model: string;
    models: Array<string | { id: string; context?: number; features?: string[] }>;
  };
  activeContextText: string;
  activeFeaturesText: string;
  activeFeatureBadges: Array<{ label: string }>;
}

function createSettingsPanel(): SettingsPanelForTest {
  const data = vi.fn();
  (window as unknown as { Alpine: { data: typeof data } }).Alpine = { data };

  initAlpineSettings();

  const factory = data.mock.calls.find(([name]) => name === 'settingsPanel')?.[1];
  expect(factory).toBeTypeOf('function');
  return factory() as SettingsPanelForTest;
}

describe('system settings model metadata display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses preset metadata when fetched model metadata is incomplete', () => {
    const panel = createSettingsPanel();
    panel.llm.provider = 'new_api';
    panel.llm.model = 'gpt-5.5';
    panel.llm.models = [{ id: 'gpt-5.5', context: 128000, features: [] }];

    expect(panel.activeContextText).toBe('1.05M');
    expect(panel.activeFeaturesText).toContain('视觉');
    expect(panel.activeFeaturesText).toContain('长上下文');
    expect(panel.activeFeatureBadges.map((badge) => badge.label)).toEqual([
      '对话',
      '视觉',
      '函数调用',
      '结构化输出',
      '流式输出',
      '推理',
      '代码',
      '长上下文',
    ]);
  });

  it('uses preset metadata when fetched models are string ids', () => {
    const panel = createSettingsPanel();
    panel.llm.provider = 'new_api';
    panel.llm.model = 'gemini-3.5-flash';
    panel.llm.models = ['gemini-3.5-flash'];

    expect(panel.activeContextText).toBe('1M');
    expect(panel.activeFeaturesText).toContain('音频');
    expect(panel.activeFeaturesText).toContain('视频');
  });
});
