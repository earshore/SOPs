import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MENU_CONFIG,
  registerModule,
  registerRoute,
} from '@/common/config/menuConfig';

const testRouteId = '__test_route__';
const testModuleId = '__test_module__';

afterEach(() => {
  delete MENU_CONFIG.routes[testRouteId];
  delete MENU_CONFIG.modules[testModuleId];
  vi.restoreAllMocks();
});

describe('menuConfig dynamic registration', () => {
  it('registers valid routes and modules through ESM validators', () => {
    expect(registerModule(testModuleId, {
      contextId: 'sys',
      title: 'Test Module',
      version: '1.0.0',
      icon: 'test',
      description: 'Test module',
    })).toBe(true);

    expect(registerRoute(testRouteId, {
      moduleId: testModuleId,
      label: 'Test Route',
      icon: 'test',
      panelId: 'panel-test',
    })).toBe(true);

    expect(MENU_CONFIG.modules[testModuleId]).toMatchObject({
      id: testModuleId,
      title: 'Test Module',
    });
    expect(MENU_CONFIG.routes[testRouteId]).toMatchObject({
      moduleId: testModuleId,
      label: 'Test Route',
    });
  });

  it('rejects duplicate and invalid dynamic registrations', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(registerRoute(testRouteId, {
      moduleId: 'home',
      label: 'Test Route',
      icon: 'test',
      panelId: 'panel-test',
    })).toBe(true);
    expect(registerRoute(testRouteId, {
      moduleId: 'home',
      label: 'Duplicate',
      icon: 'test',
      panelId: 'panel-test',
    })).toBe(false);

    expect(registerRoute('__invalid__', {
      moduleId: 'home',
    } as never)).toBe(false);
    expect(registerModule('__invalid_module__', {
      contextId: 'sys',
    } as never)).toBe(false);

    expect(consoleError).toHaveBeenCalled();
    expect(MENU_CONFIG.routes.__invalid__).toBeUndefined();
    expect(MENU_CONFIG.modules.__invalid_module__).toBeUndefined();
  });
});
