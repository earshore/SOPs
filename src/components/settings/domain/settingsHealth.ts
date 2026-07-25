// src/components/settings/domain/settingsHealth.ts

export interface SettingsHealthResult {
  ok: boolean;
  messages: string[];
}

/** Shared with quota status bar (P2-5). */
export const STORAGE_USAGE_WARN_RATIO = 0.8;

/** True when localStorage usage ratio should show the quota warning bar. */
export function isStorageQuotaWarning(ratio: number | undefined | null): boolean {
  return (
    typeof ratio === 'number' &&
    Number.isFinite(ratio) &&
    ratio >= STORAGE_USAGE_WARN_RATIO
  );
}

/**
 * Pure open-time health evaluation for system settings.
 * Does not touch storage or network — callers supply readiness flags.
 */
export function evaluateSettingsHealth(input: {
  runtimeNormalized: boolean;
  hasLlmEndpoint: boolean;
  hasLlmKey: boolean;
  storageUsageRatio?: number;
}): SettingsHealthResult {
  const messages: string[] = [];

  if (input.runtimeNormalized) {
    messages.push('运行策略数据已修复为安全默认值，请检查后保存。');
  }

  if (!input.hasLlmEndpoint) {
    messages.push('尚未配置 LLM API Endpoint。');
  } else if (!input.hasLlmKey) {
    messages.push('尚未配置 LLM API Key。');
  }

  if (isStorageQuotaWarning(input.storageUsageRatio)) {
    messages.push('本机存储占用较高，建议清理缓存或导出备份。');
  }

  return {
    ok: messages.length === 0,
    messages,
  };
}

/** True when stored runtime payload is unusable and must be repaired by normalize. */
export function isRuntimeRawInvalid(raw: unknown): boolean {
  if (raw == null) return false;
  return typeof raw !== 'object' || Array.isArray(raw);
}
