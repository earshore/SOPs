// TD-SET-01 Phase 1: updateModelStatus moved verbatim.
import { PROVIDERS } from '@/common/config/llmProviders';
import { escapeHtml, setSafeHtml } from '@/common/utils/security';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';

export async function updateModelStatus(): Promise<void> {
  const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
  const statusEl = document.getElementById('model-status');
  if (!statusEl) return;

  if (provider && typeof provider === 'string' && provider in PROVIDERS) {
    // 🔐 P0优化: 使用安全存储读取配置
    const config = await StorageService.getLLMConfigWithKey(provider);
    const providerKey = provider as keyof typeof PROVIDERS;
    const providerInfo = PROVIDERS[providerKey];
    if (config && config.apiKey && config.model && providerInfo) {
      // ✅ 安全: providerInfo.name和config.model已通过escapeHtml转义
      setSafeHtml(
        statusEl,
        `
                <span class="status-dot status-success"></span>
                <span class="text-slate-600 text-xs font-medium flex items-center gap-1">
                    ${escapeHtml(providerInfo.name)}: <span class="font-mono text-[var(--module-accent-text)]">${escapeHtml(config.model)}</span>
                </span>
            `
      );
      return;
    }
  }
  // ✅ 安全: 静态HTML模板，无用户输入
  setSafeHtml(
    statusEl,
    `
        <span class="status-dot status-pending pulse-dot"></span>
        <span class="text-slate-500 text-xs italic">等待API配置...</span>
    `
  );
}
