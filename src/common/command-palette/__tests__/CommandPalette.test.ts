import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom 的 HTMLDialogElement 存在但未实现 showModal/show/close，测试前在原型上打补丁。
beforeAll(() => {
  const DialogProto = globalThis.HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  if (typeof DialogProto.showModal !== 'function') {
    DialogProto.showModal = function (this: HTMLDialogElement): void {
      this.setAttribute('open', '');
    };
    DialogProto.show = function (this: HTMLDialogElement): void {
      this.setAttribute('open', '');
    };
    DialogProto.close = function (this: HTMLDialogElement): void {
      this.removeAttribute('open');
    };
  }
  if (!('open' in DialogProto)) {
    Object.defineProperty(globalThis.HTMLDialogElement.prototype, 'open', {
      get(this: HTMLDialogElement) {
        return this.hasAttribute('open');
      },
    });
  }
});
import { APP_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';
vi.mock('@/common/EventBus', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));
import { announceDone } from '@/common/ui/notifications';
import { CommandPaletteElement } from '../CommandPalette';
import * as paletteApi from '../index';

// 不使用 importOriginal 透传：真实的 initRouter 会创建 Navigo 适配器并注册
// onRoute handler，handler 内再调用 navigate() 会触发 Navigo hash 匹配循环
//（死递归），与测试无关且与主仓库路由模块的既有行为无关。
vi.mock('@/common/router/index', () => ({
  navigateToRouteId: vi.fn(async () => true),
  initRouter: vi.fn(),
  getRouter: vi.fn(),
  hasRoute: vi.fn(() => true),
  getCurrentRoute: vi.fn(() => ({ id: 'home' })),
}));
vi.mock('@/common/config/routeManifests', async importOriginal => {
  const original = await importOriginal<typeof import('@/common/config/routeManifests')>();
  return {
    ...original,
    ROUTE_MANIFESTS: [
      {
        moduleId: 'sops',
        title: 'SOPs 流程中心',
        routes: [
          {
            routeId: 'sops_overview',
            label: '运营总览',
            icon: 'fas fa-chart-line',
            moduleId: 'sops',
          },
          {
            routeId: 'sops_npi_tracker',
            label: '新品生命周期跟踪',
            icon: 'fas fa-seedling',
            moduleId: 'sops',
          },
        ],
        defaultRoute: 'sops_overview',
      },
      {
        moduleId: 'amz_hub',
        title: 'Amazon 智库',
        routes: [
          {
            routeId: 'hub_knowledge',
            label: '知识库',
            icon: 'fas fa-book',
            moduleId: 'amz_hub',
          },
        ],
        defaultRoute: 'hub_knowledge',
      },
      {
        moduleId: 'home',
        title: '首页',
        routes: [
          {
            routeId: 'home',
            label: '首页',
            icon: 'fas fa-home',
            moduleId: 'home',
          },
        ],
        defaultRoute: 'home',
      },
      {
        moduleId: 'app_center',
        title: '应用中心',
        routes: [
          {
            routeId: 'app_center_overview',
            label: '概览',
            icon: 'fas fa-th',
            moduleId: 'app_center',
          },
        ],
        defaultRoute: 'app_center_overview',
      },
      {
        moduleId: 'more',
        title: '更多',
        routes: [
          {
            routeId: 'more_overview',
            label: '更多',
            icon: 'fas fa-ellipsis-h',
            moduleId: 'more',
          },
        ],
        defaultRoute: 'more_overview',
      },
    ],
  };
});
vi.mock('@/common/config/menuConfig', async importOriginal => {
  const actual = await importOriginal<typeof import('@/common/config/menuConfig')>();
  return {
    ...actual,
    MENU_CONFIG: {
      ...actual.MENU_CONFIG,
      modules: {
        sops: {
          title: 'SOPs 流程中心',
          icon: 'fas fa-project-diagram',
          color: '#0f766e',
        },
        amz_hub: {
          title: 'Amazon 智库',
          icon: 'fas fa-book-open',
          color: '#0369a1',
        },
      },
    },
  };
});
vi.mock('@/common/ui/notifications', () => ({
  announceDone: vi.fn(),
  showToast: vi.fn(),
}));

const mockedAnnounce = vi.mocked(announceDone);
const mockedEmit = vi.mocked(eventBus.emit);

function getMockedNavigate(): ReturnType<typeof vi.fn> {
  return vi.mocked(
    (window as unknown as Record<string, unknown>).__cmdkNav as ReturnType<typeof vi.fn>
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';
  const router = await import('@/common/router/index');
  (window as unknown as Record<string, unknown>).__cmdkNav = router.navigateToRouteId;
});

afterEach(() => {
  document.body.innerHTML = '';
});

function buildPalette(): CommandPaletteElement {
  const element = new CommandPaletteElement();
  document.body.append(element);
  // append 已自动触发 connectedCallback（jsdom CE reactions），无需手动调用。
  return element;
}

function inputOf(element: CommandPaletteElement): HTMLInputElement {
  return element.querySelector<HTMLInputElement>('input[role="combobox"]')!;
}

function optionsOf(element: CommandPaletteElement): Element[] {
  return Array.from(element.querySelectorAll('[role="option"]'));
}

describe('CommandPaletteElement', () => {
  it('opens with combobox/listbox a11y structure', () => {
    const element = buildPalette();
    element.open();
    const dialog = element.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(inputOf(element).getAttribute('aria-expanded')).toBe('true');
    expect(inputOf(element).getAttribute('aria-controls')).toBe('sops-command-palette-list');
    expect(element.querySelector('[role="listbox"]')).toBeTruthy();
    expect(optionsOf(element).length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(inputOf(element));
    element.close();
  });

  it('emits open/close events and restores focus', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    anchor.focus();
    const element = buildPalette();
    element.open();
    expect(mockedEmit).toHaveBeenCalledWith(APP_EVENTS.COMMAND_PALETTE_OPEN);
    element.close();
    expect(mockedEmit).toHaveBeenCalledWith(APP_EVENTS.COMMAND_PALETTE_CLOSE);
    expect(document.activeElement).toBe(anchor);
  });

  it('executes route items and writes recent history', async () => {
    const element = buildPalette();
    element.open();
    const options = optionsOf(element);
    const routeOption = options.find(opt => opt.textContent?.includes('新品生命周期跟踪'));
    expect(routeOption).toBeTruthy();
    (routeOption as HTMLElement).click();
    await vi.waitFor(() => expect(getMockedNavigate()).toHaveBeenCalled());
    expect(mockedAnnounce).toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem('sops:command-palette:recent') || '[]');
    expect(stored.some((entry: { id: string }) => entry.id === 'sops_npi_tracker')).toBe(true);
    expect(element.parentElement).toBeNull();
  });

  it('executes action items via their execute handler', async () => {
    const element = buildPalette();
    element.open();
    const options = optionsOf(element);
    const actionOption = options.find(opt => opt.textContent?.includes('返回首页'));
    expect(actionOption).toBeTruthy();
    (actionOption as HTMLElement).click();
    await vi.waitFor(() => expect(getMockedNavigate()).toHaveBeenCalledWith('home'));
    expect(mockedAnnounce).toHaveBeenCalled();
  });

  it('filters as the user types and shows the empty hint when nothing matches', () => {
    const element = buildPalette();
    element.open();
    const input = inputOf(element);
    input.value = 'zzz不存在的关键词xxx';
    input.dispatchEvent(new Event('input'));
    expect(element.querySelector('.sops-command-palette-empty')?.textContent).toBeTruthy();
    input.value = '新品';
    input.dispatchEvent(new Event('input'));
    expect(optionsOf(element).some(opt => opt.textContent?.includes('新品生命周期跟踪'))).toBe(
      true
    );
    element.close();
  });

  it('cycles keyboard focus through the option list', () => {
    const element = buildPalette();
    element.open();
    const input = inputOf(element);
    const down = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
    });
    input.dispatchEvent(down);
    expect(document.activeElement?.getAttribute('role')).toBe('option');
    const up = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    (document.activeElement as HTMLElement).dispatchEvent(up);
    expect(document.activeElement).toBe(input);
    element.close();
  });

  it('fallbacks to settings-llm when Enter pressed on empty results', async () => {
    const element = buildPalette();
    element.open();
    const input = inputOf(element);
    input.value = 'zzz不存在的关键词xxx';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() =>
      expect(mockedEmit).toHaveBeenCalledWith(APP_EVENTS.SETTINGS_OPEN, {
        sectionId: 'settings-section-llm',
      })
    );
  });
});

describe('public palette API', () => {
  it('initCommandPalette opens on Ctrl+K and ignores typing contexts', () => {
    paletteApi.initCommandPalette();
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    );
    expect(document.body.querySelector('sops-command-palette')).toBeNull();
    document.body.removeChild(input);
    document.body.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    );
    expect(document.body.querySelector('sops-command-palette')).toBeTruthy();
  });

  it('openCommandPalette / closeCommandPalette control the panel', () => {
    paletteApi.initCommandPalette();
    paletteApi.openCommandPalette('新品');
    const element = document.body.querySelector<CommandPaletteElement>('sops-command-palette');
    expect(element?.querySelector('dialog')?.open).toBe(true);
    paletteApi.closeCommandPalette();
    expect(document.body.querySelector('sops-command-palette')).toBeNull();
  });
});
