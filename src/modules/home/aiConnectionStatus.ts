// src/modules/home/aiConnectionStatus.ts
// 首页 AI 状态徽标数据来源（P0-1 首屏真实 AI 状态）。
// 纯函数模块，零 UI 依赖：读取 LLM 配置快照并产出连接状态。
import { getLlmProviderConfig } from '@/common/config/llmProviders';
import { StorageService } from '@/services/storageService';
import { evaluateSettingsHealth } from '@/common/settings/settingsHealth';
import {
  loadProviderApiKey,
  resolveProviderEndpoint,
  type SavedLlmConfigLike,
} from '@/common/settings/settingsLlmModel';

export type AiConnectionState = 'connected' | 'unconfigured' | 'error';

export interface AiConnectionStatus {
  state: AiConnectionState;
  provider?: string;
  /** 供徽标渲染的简明中文描述 */
  label: string;
}

const HOME_AI_WELCOME_SHOWN = 'home_ai_welcome_shown';

function readActiveProvider(): string | null {
  return StorageService.get<string>('llm_active_provider') || null;
}

function readProviderConfig(provider: string): SavedLlmConfigLike | null {
  try {
    return StorageService.get<Record<string, unknown>>(
      `llm_${provider}`
    ) as SavedLlmConfigLike | null;
  } catch {
    return null;
  }
}

/** 由 endpoint/key 的缺失组合推导状态与中文标签（纯函数，便于单测）。 */
function deriveStatusFromReadiness(
  provider: string,
  hasEndpoint: boolean,
  hasKey: boolean
): AiConnectionStatus {
  const health = evaluateSettingsHealth({
    runtimeNormalized: false,
    hasLlmEndpoint: hasEndpoint,
    hasLlmKey: hasKey,
  });
  if (health.ok) {
    return { state: 'connected', provider, label: 'AI 已连接 · 就绪' };
  }
  const missingEndpoint = !hasEndpoint;
  const missingKey = !hasKey;
  if (missingEndpoint && missingKey) {
    return {
      state: 'unconfigured',
      provider,
      label: 'AI 未配置 · Endpoint 与 Key 缺失',
    };
  }
  if (missingEndpoint) {
    return { state: 'unconfigured', provider, label: 'AI 未配置 · 缺少 Endpoint' };
  }
  return { state: 'unconfigured', provider, label: 'AI 未配置 · 缺少 API Key' };
}

/**
 * 读取当前 LLM 连接状态（同步 + 轻量异步：仅判 Key 存在性时用 getSecure）。
 * 状态判定与设置面板 diagnostics 的健康判定同源（evaluateSettingsHealth）。
 */
export async function getAiConnectionStatus(): Promise<AiConnectionStatus> {
  const provider = readActiveProvider();
  if (!provider) {
    return { state: 'unconfigured', label: 'AI 未连接 · 完成首次配置' };
  }
  const config = getLlmProviderConfig(provider);
  const savedConfig = readProviderConfig(provider);
  const endpoint = config
    ? resolveProviderEndpoint(provider, config, savedConfig?.endpoint || '')
    : '';
  let apiKey = '';
  try {
    apiKey = await loadProviderApiKey(provider, savedConfig);
  } catch {
    apiKey = '';
  }
  return deriveStatusFromReadiness(
    provider,
    Boolean((endpoint || '').trim()),
    Boolean((apiKey || '').trim())
  );
}

/** 首页首启引导 toast 是否已展示过的标记位。 */
export function isWelcomeShown(): boolean {
  return StorageService.get<string>(HOME_AI_WELCOME_SHOWN) === '1';
}

export function markWelcomeShown(): void {
  StorageService.set(HOME_AI_WELCOME_SHOWN, '1');
}
