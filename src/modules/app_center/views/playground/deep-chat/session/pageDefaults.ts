import { isReasoningEffortLevel, type ReasoningEffortLevel } from '@/services/modelCapability';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { normalizeTemperature } from '../infra/utils';

/**
 * Deep Chat 页面级默认设置（调试参数）。
 * 模型默认不走本存储：工具策略默认模型（TOOL_STRATEGY_SETTINGS）已覆盖（spec
 * docs/superpowers/specs/2026-08-10-deep-chat-session-model-persistence-design.md §2.2）。
 * 优先级：线程显式值 > 页面默认 > 全局默认。
 */
export interface DeepChatPageDefaults {
  systemPrompt?: string;
  temperature?: number;
  reasoning?: { enabled?: boolean; effort?: ReasoningEffortLevel };
  /**
   * 写入 reasoning 时记录的 provider reasoningPrefs 指纹。
   * 全局推理设置变更后（指纹不匹配）页面默认推理失效并跟随全局；
   * 存储保留，用户下次显式改动时刷新指纹。
   */
  reasoningFingerprint?: string;
}

export function sanitizePageDefaults(raw: unknown): DeepChatPageDefaults | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const value = raw as Partial<DeepChatPageDefaults>;
  const sanitized: DeepChatPageDefaults = {};

  const systemPrompt = sanitizeSystemPromptPart(value.systemPrompt);
  if (systemPrompt) {
    sanitized.systemPrompt = systemPrompt;
  }

  const temperature = sanitizeTemperaturePart(value.temperature);
  if (temperature !== undefined) {
    sanitized.temperature = temperature;
  }

  const reasoning = sanitizeReasoningPart(value.reasoning);
  if (reasoning) {
    sanitized.reasoning = reasoning;
  }

  const reasoningFingerprint = sanitizeFingerprintPart(value.reasoningFingerprint);
  if (reasoningFingerprint) {
    sanitized.reasoningFingerprint = reasoningFingerprint;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function sanitizeSystemPromptPart(value: unknown): string | undefined {
  const systemPrompt = typeof value === 'string' ? value.trim() : '';
  return systemPrompt || undefined;
}

function sanitizeTemperaturePart(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return normalizeTemperature(String(value));
}

function sanitizeFingerprintPart(value: unknown): string | undefined {
  const fingerprint = typeof value === 'string' ? value.trim() : '';
  return fingerprint || undefined;
}

function sanitizeReasoningPart(
  reasoningRaw: DeepChatPageDefaults['reasoning'] | undefined
): { enabled?: boolean; effort?: ReasoningEffortLevel } | undefined {
  if (!reasoningRaw || typeof reasoningRaw !== 'object') {
    return undefined;
  }
  const enabled = typeof reasoningRaw.enabled === 'boolean' ? reasoningRaw.enabled : undefined;
  const effort = isReasoningEffortLevel(reasoningRaw.effort) ? reasoningRaw.effort : undefined;
  if (enabled === undefined && effort === undefined) {
    return undefined;
  }
  return {
    ...(enabled !== undefined ? { enabled } : {}),
    ...(effort !== undefined ? { effort } : {}),
  };
}

export function readPageDefaults(): DeepChatPageDefaults {
  return sanitizePageDefaults(StorageService.get(STORAGE_KEYS.DEEP_CHAT_PAGE_DEFAULTS)) ?? {};
}

export function writePageDefaults(partial: DeepChatPageDefaults): void {
  const next = sanitizePageDefaults({ ...readPageDefaults(), ...partial });
  if (next) {
    StorageService.set(STORAGE_KEYS.DEEP_CHAT_PAGE_DEFAULTS, next);
  } else {
    StorageService.remove(STORAGE_KEYS.DEEP_CHAT_PAGE_DEFAULTS);
  }
}

export function clearPageDefaults(): void {
  StorageService.remove(STORAGE_KEYS.DEEP_CHAT_PAGE_DEFAULTS);
}

/** 页面默认推理的指纹口径：与 readEffectivePageDefaults 判定保持一致。 */
export function resolveReasoningFingerprint(provider: string): string {
  return JSON.stringify(StorageService.getLLMConfig(provider)?.reasoningPrefs ?? null);
}

/**
 * 生效页面默认：推理指纹与当前 provider 全局 reasoningPrefs 不一致时，
 * 丢弃页面默认推理（跟随全局），其余字段不变。
 */
export function readEffectivePageDefaults(provider: string): DeepChatPageDefaults {
  const defaults = readPageDefaults();
  if (!defaults.reasoning) {
    return defaults;
  }
  if (defaults.reasoningFingerprint !== resolveReasoningFingerprint(provider)) {
    const { reasoning: _reasoning, reasoningFingerprint: _fingerprint, ...rest } = defaults;
    return rest;
  }
  return defaults;
}
