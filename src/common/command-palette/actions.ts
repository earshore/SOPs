/**
 * actions.ts - 命令面板静态动作命令配置表（一期 7 条，硬编码便于二期扩展）
 *
 * 所有动作命令均通过事件总线深链或公共 API 执行，不直接调用组件内部函数，
 * 保持与 settings 面板深链机制（APP_EVENTS.SETTINGS_OPEN）同一模式。
 */
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { ThemeManager } from '@/common/config/themeConfig';

import type { ActionCommandItem } from './types';

// 延迟 resolve，避免模块求值期静态绑定导致测试 mock 失效（actions.ts 与
// 面板共享同一 mock 时点）。运行时解析开销由模块缓存承担，可忽略。
// themeConfig 例外：main.ts / settings 已静态引入（必然在主 chunk），动态
// import 无法拆包，故直接静态绑定（见 resolveTheme）。
function resolveNavigate(): Promise<(routeId: string) => Promise<boolean>> {
  return import('@/common/router/index').then(m => m.navigateToRouteId);
}

function resolveEventBus(): Promise<{
  emit(event: string, payload?: unknown): void;
}> {
  return import('@/common/EventBus').then(m => m.default);
}

function resolveTheme(): Promise<{ applyColorMode(mode: string): void }> {
  return Promise.resolve(ThemeManager as { applyColorMode(mode: string): void });
}

type SettingsSectionId =
  'settings-section-llm' | 'settings-section-data' | 'settings-section-appearance';

/** 通过事件总线打开设置面板，可带 sectionId 深链参数（与 systemSettings.ts 同一模式）。 */
function openSettings(sectionId?: SettingsSectionId): Promise<void> {
  return resolveEventBus().then(bus => {
    bus.emit(APP_EVENTS.SETTINGS_OPEN, sectionId ? { sectionId } : undefined);
  });
}

export function createActionItems(): ActionCommandItem[] {
  return [
    {
      kind: 'action',
      id: 'go-home',
      label: '返回首页',
      icon: 'fas fa-home',
      moduleLabel: '',
      moduleId: '',
      description: '跳转至应用首页',
      keywords: ['首页', 'home', 'splash', '主页面'],
      execute: () => resolveNavigate().then(nav => void nav('home')),
    },
    {
      kind: 'action',
      id: 'open-settings',
      label: '打开设置',
      icon: 'fas fa-cog',
      moduleLabel: '',
      moduleId: '',
      description: '打开系统设置面板',
      keywords: ['设置', '配置', '偏好', '选项'],
      execute: () => openSettings(),
    },
    {
      kind: 'action',
      id: 'open-settings-llm',
      label: '打开设置 · AI 配置',
      icon: 'fas fa-robot',
      moduleLabel: '',
      moduleId: '',
      description: '配置 LLM 接入',
      keywords: ['ai', 'llm', '模型', 'api key', '接入'],
      execute: () => openSettings('settings-section-llm'),
    },
    {
      kind: 'action',
      id: 'open-settings-data',
      label: '打开设置 · 数据与备份',
      icon: 'fas fa-database',
      moduleLabel: '',
      moduleId: '',
      description: '数据备份与恢复',
      keywords: ['备份', '导入', '导出', '数据', '恢复'],
      execute: () => openSettings('settings-section-data'),
    },
    {
      kind: 'action',
      id: 'open-settings-appearance',
      label: '打开设置 · 外观',
      icon: 'fas fa-palette',
      moduleLabel: '',
      moduleId: '',
      description: '主题与颜色设置',
      keywords: ['主题', '颜色', '深色', '浅色', '外观', '模式'],
      execute: () => openSettings('settings-section-appearance'),
    },
    {
      kind: 'action',
      id: 'color-mode-dark',
      label: '切换深色模式',
      icon: 'fas fa-moon',
      moduleLabel: '',
      moduleId: '',
      description: '启用深色主题',
      keywords: ['dark', '夜间', '深色', '模式', '主题'],
      execute: () => resolveTheme().then(theme => theme.applyColorMode('dark')),
    },
    {
      kind: 'action',
      id: 'color-mode-light',
      label: '切换浅色模式',
      icon: 'fas fa-sun',
      moduleLabel: '',
      moduleId: '',
      description: '启用浅色主题',
      keywords: ['light', '浅色', '明亮', '模式', '主题'],
      execute: () => resolveTheme().then(theme => theme.applyColorMode('light')),
    },
    {
      kind: 'action',
      id: 'color-mode-system',
      label: '切换跟随系统',
      icon: 'fas fa-desktop',
      moduleLabel: '',
      moduleId: '',
      description: '跟随操作系统主题',
      keywords: ['system', '跟随系统', '自动', '模式', '主题'],
      execute: () => resolveTheme().then(theme => theme.applyColorMode('system')),
    },
  ];
}
