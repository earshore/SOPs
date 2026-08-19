// src/common/errors/llmFailureUx.ts
// Unified LLM failure copy + optional deep-link into system settings.

import { APP_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';
import { showToast, type ToastType } from '@/common/ui/notifications';

import { isAppError } from './AppError';

import type { SettingsOpenOptions } from '@/components/settings/settingsOpenOptions';

export interface LlmFailureUx {
  title: string;
  description?: string;
  toastType: ToastType;
  /** When set, toast should offer “打开设置” and deep-link here. */
  openSettings?: SettingsOpenOptions;
  actionLabel?: string;
  code?: string;
}

const LLM_SECTION: SettingsOpenOptions = {
  sectionId: 'settings-section-llm',
};

const TOOL_STRATEGY_SECTION: SettingsOpenOptions = {
  sectionId: 'settings-section-tool-strategy',
};

const DATA_SECTION: SettingsOpenOptions = {
  sectionId: 'settings-section-data',
};

interface CodeUxTemplate {
  title: string;
  description?: string;
  toastType: ToastType;
  openSettings?: SettingsOpenOptions;
  actionLabel?: string;
}

const UX_PROVIDER_NOT_SELECTED: CodeUxTemplate = {
  title: '请先在系统设置中选择 LLM 提供商',
  description: '打开全局设置 → AI 模型与连接，选择厂商配置档',
  toastType: 'warning',
  openSettings: LLM_SECTION,
  actionLabel: '打开设置',
};

const UX_API_KEY_MISSING: CodeUxTemplate = {
  title: '所选提供商未配置 API Key',
  description: '在凭证步骤填写 API Key 并保存后再试',
  toastType: 'warning',
  openSettings: LLM_SECTION,
  actionLabel: '打开设置',
};

const UX_MODEL_NOT_SELECTED: CodeUxTemplate = {
  title: '未选择模型，请在设置中同步或选择模型',
  description: '获取模型列表后选择默认模型；也可检查工具策略绑定',
  toastType: 'warning',
  openSettings: LLM_SECTION,
  actionLabel: '打开设置',
};

const UX_API_INVALID_KEY: CodeUxTemplate = {
  title: 'API Key 无效或已过期',
  description: '请更新凭证，或确认中转站鉴权与 Key 权限',
  toastType: 'error',
  openSettings: LLM_SECTION,
  actionLabel: '打开设置',
};

const UX_API_RATE_LIMIT: CodeUxTemplate = {
  title: '请求过于频繁',
  description: '请稍后再试，或降低并发 / 换用其它模型档',
  toastType: 'warning',
  openSettings: LLM_SECTION,
  actionLabel: '打开设置',
};

const UX_API_QUOTA_EXCEEDED: CodeUxTemplate = {
  title: 'API 配额已用尽',
  description: '请在中转站后台检查额度，或更换可用 Key',
  toastType: 'error',
  openSettings: LLM_SECTION,
  actionLabel: '打开设置',
};

const UX_TIMEOUT: CodeUxTemplate = {
  title: 'AI 响应超时',
  description: '可重试；持续失败时检查网络或缩短输入',
  toastType: 'error',
};

const UX_NETWORK: CodeUxTemplate = {
  title: '网络不可用',
  description: '请检查网络连接后重试；静态页本身可继续使用本地功能',
  toastType: 'error',
};

const UX_STORAGE_FULL: CodeUxTemplate = {
  title: '本地存储空间不足',
  description: '可导出备份后清理缓存/历史，或在数据区释放空间',
  toastType: 'error',
  openSettings: DATA_SECTION,
  actionLabel: '打开数据设置',
};

const UX_STORAGE_ERROR: CodeUxTemplate = {
  title: '本地数据保存失败',
  description: '请重试；若反复失败可导出备份后清理空间',
  toastType: 'error',
  openSettings: DATA_SECTION,
  actionLabel: '打开数据设置',
};

const UX_NO_MODEL_CONFIGURED: CodeUxTemplate = {
  title: '请先在设置中配置 AI 模型',
  description: '选择提供商、填写 Key 并同步模型列表',
  toastType: 'warning',
  openSettings: LLM_SECTION,
  actionLabel: '打开设置',
};

const CODE_UX: Record<string, CodeUxTemplate> = {
  ERR_LLM_PROVIDER_NOT_SELECTED: UX_PROVIDER_NOT_SELECTED,
  ERR_LLM_API_KEY_MISSING: UX_API_KEY_MISSING,
  ERR_LLM_MODEL_NOT_SELECTED: UX_MODEL_NOT_SELECTED,
  API_INVALID_KEY: UX_API_INVALID_KEY,
  API_RATE_LIMIT: UX_API_RATE_LIMIT,
  API_QUOTA_EXCEEDED: UX_API_QUOTA_EXCEEDED,
  LLM_TIMEOUT: UX_TIMEOUT,
  NET_TIMEOUT: UX_TIMEOUT,
  NET_OFFLINE: UX_NETWORK,
  NET_REQUEST_FAILED: UX_NETWORK,
  SYS_STORAGE_FULL: UX_STORAGE_FULL,
  SYS_STORAGE_ERROR: UX_STORAGE_ERROR,
  BIZ_NO_MODEL_CONFIGURED: UX_NO_MODEL_CONFIGURED,
};

const MESSAGE_HINTS: Array<{
  test: (lower: string) => boolean;
  ux: CodeUxTemplate;
  code: string;
}> = [
  {
    code: 'API_INVALID_KEY',
    test: lower =>
      lower.includes('401') ||
      lower.includes('unauthorized') ||
      lower.includes('api key') ||
      lower.includes('api密钥') ||
      lower.includes('认证失败'),
    ux: UX_API_INVALID_KEY,
  },
  {
    code: 'API_RATE_LIMIT',
    test: lower =>
      lower.includes('429') || lower.includes('rate limit') || lower.includes('过于频繁'),
    ux: UX_API_RATE_LIMIT,
  },
  {
    code: 'LLM_TIMEOUT',
    test: lower => lower.includes('timeout') || lower.includes('超时'),
    ux: UX_TIMEOUT,
  },
  {
    code: 'API_QUOTA_EXCEEDED',
    test: lower => lower.includes('quota') || lower.includes('配额'),
    ux: UX_API_QUOTA_EXCEEDED,
  },
];

function lookupCodeUx(code: string | undefined): CodeUxTemplate | undefined {
  if (!code) return undefined;
  return CODE_UX[code];
}

function codeOf(error: unknown): string | undefined {
  if (isAppError(error)) return error.code;
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  return '操作失败，请重试';
}

function fromTemplate(
  code: string | undefined,
  message: string,
  template: CodeUxTemplate
): LlmFailureUx {
  // Prefer runtime ValidationError message for ERR_LLM_* so copy stays SSOT with bridge.
  const preferMessage =
    Boolean(code?.startsWith('ERR_LLM_')) && message && message !== '操作失败，请重试';
  return {
    title: preferMessage ? message : template.title,
    description: template.description,
    toastType: template.toastType,
    openSettings: template.openSettings,
    actionLabel: template.actionLabel,
    code,
  };
}

/**
 * Map known LLM / storage failure codes (and common message patterns) to actionable UX.
 */
export function formatLlmFailureUx(error: unknown): LlmFailureUx {
  const code = codeOf(error);
  const message = messageOf(error);

  const byCode = lookupCodeUx(code);
  if (byCode) {
    return fromTemplate(code, message, byCode);
  }

  const lower = message.toLowerCase();
  const hinted = MESSAGE_HINTS.find(entry => entry.test(lower));
  if (hinted) {
    return fromTemplate(hinted.code, message, hinted.ux);
  }

  if (message.includes('工具策略') || message.includes('tool strategy')) {
    return {
      title: message,
      description: '可在工具策略中调整默认模型后重试',
      toastType: 'warning',
      openSettings: TOOL_STRATEGY_SECTION,
      actionLabel: '打开工具策略',
    };
  }

  return {
    title: message,
    toastType: 'error',
    code,
  };
}

export function openSettingsFromLlmFailure(options?: SettingsOpenOptions): void {
  const deepLink = options ?? LLM_SECTION;
  eventBus.emit(APP_EVENTS.SETTINGS_OPEN, {
    ...deepLink,
    timestamp: Date.now(),
  });
}

export interface ShowLlmFailureToastOptions {
  /** Prefix title, e.g. "分析失败：" — only used when the failure is not a known config/auth code. */
  titlePrefix?: string;
  duration?: number;
}

function shouldUseTitlePrefix(ux: LlmFailureUx): boolean {
  if (ux.openSettings) return false;
  if (!ux.code) return true;
  if (ux.code.startsWith('ERR_LLM_') || ux.code.startsWith('API_')) return false;
  return ux.code !== 'LLM_TIMEOUT' && ux.code !== 'NET_TIMEOUT';
}

/**
 * Show a toast for an LLM-related failure; offers deep-link action when applicable.
 */
export function showLlmFailureToast(
  error: unknown,
  options: ShowLlmFailureToastOptions = {}
): LlmFailureUx {
  const ux = formatLlmFailureUx(error);
  const usePrefix = Boolean(options.titlePrefix) && shouldUseTitlePrefix(ux);
  const title = usePrefix ? `${options.titlePrefix}${ux.title}` : ux.title;
  const duration =
    options.duration ?? (ux.openSettings ? 8000 : ux.toastType === 'warning' ? 5500 : 4500);

  showToast(title, {
    type: ux.toastType,
    description: ux.description,
    duration,
    action: ux.openSettings
      ? {
          label: ux.actionLabel ?? '打开设置',
          onClick: () => openSettingsFromLlmFailure(ux.openSettings),
        }
      : undefined,
  });

  return ux;
}
