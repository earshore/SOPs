import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { navigateToRouteId } from '@/common/router/index';
import { ThemeManager } from '@/common/config/themeConfig';
import eventBus from '@/common/EventBus';
import { createActionItems } from '../actions';
import type { ActionCommandItem } from '../types';

vi.mock('@/common/router/index', () => ({ navigateToRouteId: vi.fn() }));
vi.mock('@/common/config/themeConfig', () => ({
  ThemeManager: { applyColorMode: vi.fn() },
}));
vi.mock('@/common/EventBus', () => ({ default: { emit: vi.fn() } }));

const mockedNavigate = vi.mocked(navigateToRouteId);
const mockedApplyColorMode = vi.mocked(ThemeManager.applyColorMode);
const mockedEmit = vi.mocked(eventBus.emit);

describe('createActionItems', () => {
  let items: ActionCommandItem[];

  beforeEach(() => {
    items = createActionItems();
    vi.clearAllMocks();
  });

  it('exposes the full one-phase action table with required keywords', () => {
    expect(items.length).toBe(8);
    const ids = items.map(item => item.id);
    expect(ids).toEqual([
      'go-home',
      'open-settings',
      'open-settings-llm',
      'open-settings-data',
      'open-settings-appearance',
      'color-mode-dark',
      'color-mode-light',
      'color-mode-system',
    ]);
    for (const item of items) {
      expect(item.kind).toBe('action');
      expect(item.keywords.length).toBeGreaterThan(0);
      expect(item.label).toBeTruthy();
      expect(item.execute).toBeTypeOf('function');
    }
  });

  it('go-home navigates to the home route', async () => {
    mockedNavigate.mockResolvedValueOnce(true);
    await items.find(item => item.id === 'go-home')!.execute();
    expect(mockedNavigate).toHaveBeenCalledWith('home');
  });

  it('settings actions emit SETTINGS_OPEN with the right section deep link', async () => {
    await items.find(item => item.id === 'open-settings')!.execute();
    expect(mockedEmit).toHaveBeenCalledWith(APP_EVENTS.SETTINGS_OPEN, undefined);

    await items.find(item => item.id === 'open-settings-llm')!.execute();
    expect(mockedEmit).toHaveBeenCalledWith(APP_EVENTS.SETTINGS_OPEN, {
      sectionId: 'settings-section-llm',
    });

    await items.find(item => item.id === 'open-settings-data')!.execute();
    expect(mockedEmit).toHaveBeenCalledWith(APP_EVENTS.SETTINGS_OPEN, {
      sectionId: 'settings-section-data',
    });

    await items.find(item => item.id === 'open-settings-appearance')!.execute();
    expect(mockedEmit).toHaveBeenCalledWith(APP_EVENTS.SETTINGS_OPEN, {
      sectionId: 'settings-section-appearance',
    });
  });

  it('color mode actions delegate to ThemeManager.applyColorMode', async () => {
    await items.find(item => item.id === 'color-mode-dark')!.execute();
    expect(mockedApplyColorMode).toHaveBeenCalledWith('dark');
    await items.find(item => item.id === 'color-mode-light')!.execute();
    expect(mockedApplyColorMode).toHaveBeenCalledWith('light');
    await items.find(item => item.id === 'color-mode-system')!.execute();
    expect(mockedApplyColorMode).toHaveBeenCalledWith('system');
  });
});
