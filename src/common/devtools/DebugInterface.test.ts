import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import debugInterface, { type DebugInterface } from './DebugInterface';
import { StorageService } from '@services/storageService';

const mocks = vi.hoisted(() => ({
  appState: {
    currentModule: 'app_center',
    currentPanel: 'master_analysis',
  },
  registeredServices: ['storage', 'logger'],
  storageClear: vi.fn(),
}));

vi.mock('@services/storageService', () => ({
  StorageService: {
    clear: mocks.storageClear,
  },
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => mocks.appState,
  },
}));

vi.mock('../config/menuConfig', () => ({
  MENU_CONFIG: {
    routes: {
      masterAnalysis: {
        label: 'Master Analysis',
        moduleId: 'app_center',
        panelId: 'master_analysis',
      },
      keywordHunter: {
        label: 'Keyword Hunter',
        moduleId: 'app_center',
        panelId: 'keyword_hunter',
      },
    },
  },
}));

vi.mock('../di/Container', () => ({
  container: {
    getRegisteredServices: () => mocks.registeredServices,
  },
}));

function exposedDebug(): DebugInterface | undefined {
  return (window as unknown as { __DEBUG__?: DebugInterface }).__DEBUG__;
}

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.storageClear.mockReset();
  debugInterface.cleanup();
  delete (window as unknown as { __DEBUG__?: unknown }).__DEBUG__;
});

afterEach(() => {
  debugInterface.cleanup();
});

describe('DebugInterface', () => {
  it('initializes debug utilities and exposes them on window', () => {
    debugInterface.initialize();
    debugInterface.initialize();

    const debug = exposedDebug();

    expect(debug?.utils?.showState?.()).toBe(mocks.appState);
    expect(debug?.utils?.showRoutes?.()).toEqual([
      {
        id: 'masterAnalysis',
        label: 'Master Analysis',
        moduleId: 'app_center',
        panelId: 'master_analysis',
      },
      {
        id: 'keywordHunter',
        label: 'Keyword Hunter',
        moduleId: 'app_center',
        panelId: 'keyword_hunter',
      },
    ]);
    expect(debug?.utils?.showServices?.()).toEqual({ services: mocks.registeredServices });
    expect(debug?.utils?.exportLogs?.()).toEqual({
      available: false,
      reason: 'Logger.download() is deprecated, logs export not available',
    });
  });

  it('clears storage only after confirmation', () => {
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    debugInterface.initialize();

    expect(exposedDebug()?.utils?.clearStorage?.()).toEqual({
      cleared: false,
      reason: 'cancelled',
    });
    expect(StorageService.clear).not.toHaveBeenCalled();

    expect(exposedDebug()?.utils?.clearStorage?.()).toEqual({ cleared: true });
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(StorageService.clear).toHaveBeenCalledTimes(1);
  });

  it('registers runtime objects and services in development mode', () => {
    const containerRef = { name: 'container' };
    const stateRef = { ready: true };
    const routerRef = { navigate: vi.fn() };
    const serviceRef = { get: vi.fn() };

    debugInterface.initialize();
    debugInterface.registerContainer(containerRef);
    debugInterface.registerState(stateRef);
    debugInterface.registerRouter(routerRef);
    debugInterface.registerService('storage', serviceRef);

    expect(exposedDebug()).toMatchObject({
      container: containerRef,
      state: stateRef,
      router: routerRef,
      services: {
        storage: serviceRef,
      },
    });
  });

  it('removes the global debug interface during cleanup', () => {
    debugInterface.initialize();
    expect(exposedDebug()).toBeDefined();

    debugInterface.cleanup();

    expect(exposedDebug()).toBeUndefined();
  });
});
