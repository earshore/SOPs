// TD-SET-01 Phase 4: llm persistence/connection action cluster (kept under 600-line section limit).
import { showToast } from '@/common/ui';
import { getModelId } from '@/common/utils/modelOptions';
import { confirmWithModal } from '@/components/modal/confirmModal';
import { pushSettingsRollbackSnapshot } from '@/components/settings/domain/settingsRollback';
import { ErrorService } from '@/services/errorService';
import { callLLM } from '@/services/llmService';
import {
  DEFAULT_REASONING_PREFS,
  clampEffort,
  isReasoningEffortLevel,
  normalizeApiPathId,
  normalizeReasoningUserPrefs,
  type ReasoningEffortLevel,
} from '@/services/modelCapability';
import { StorageService } from '@/services/storageService';

import { saveSettingsDomainPartition } from '../domain/settingsDomain';
import {
  LLM_TEST_CONNECTION_MAX_TOKENS,
  apiPathIdForFamily,
  buildAutoSaveLlmConfig,
  isLLMApiKeyRequired,
} from '../domain/settingsLlmModel';
import { updateModelStatus } from '../domain/settingsModelStatus';

import type { ModelOption } from '../domain/localDataCopy';
import type { LlmApiFamilyId, SettingsPanelPart } from '../panelTypes';
import type { LLMProviderConfig } from '@/types/state';

export const llmSectionRichBehavior: SettingsPanelPart = {
  async testConnection(): Promise<void> {
    if (!this.llm.endpoint || !this.llm.model) {
      showToast('请先完善配置 (端点 + 模型)', { type: 'warning' });
      return;
    }

    if (isLLMApiKeyRequired(this.llm) && !this.llm.apiKey) {
      showToast('请先完善配置 (Key + 模型)', { type: 'warning' });
      return;
    }

    this.llm.isTesting = true;
    try {
      showToast('正在发送测试请求...', { type: 'info' });
      const messages = [{ role: 'user' as const, content: "Hello! Reply 'OK'." }];

      const modelsEntry =
        this.llm.models.find(x => getModelId(x) === this.llm.model) ?? this.llm.model;
      await callLLM(
        messages,
        this.llm.provider,
        this.llm.endpoint,
        this.llm.apiKey,
        this.llm.model,
        {
          temperature: 0.1,
          jsonMode: false,
          maxTokens: LLM_TEST_CONNECTION_MAX_TOKENS,
          ...(this.llm.serviceTier && { serviceTier: this.llm.serviceTier }),
          reasoningPrefs: this.llm.reasoningPrefs,
          apiPath: normalizeApiPathId(this.llm.apiPath),
          modelsEntry,
          stream: true,
          timeout: this.runtimeStrategy.settings.llm.testConnectionTimeoutMs,
        }
      );

      showToast('连接成功！', { type: 'success' });
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'testConnection', module: 'settings' });
    } finally {
      this.llm.isTesting = false;
    }
  },

  async saveProviderConfig(): Promise<void> {
    if (isLLMApiKeyRequired(this.llm) && !this.llm.apiKey) {
      showToast('请填写 API Key', { type: 'warning' });
      return;
    }

    try {
      // 🔐 P0优化: 使用安全存储保存API密钥
      const newConfig: LLMProviderConfig = {
        provider: this.llm.provider,
        endpoint: this.llm.endpoint,
        model: this.llm.model,
        models: this.llm.models,
        ...(this.llm.serviceTier && { serviceTier: this.llm.serviceTier }),
        reasoningPrefs: normalizeReasoningUserPrefs(this.llm.reasoningPrefs),
        apiPath: normalizeApiPathId(this.llm.apiPath),
        enabled: true,
        apiKey: '', // 占位符,实际存储在安全存储中
      };

      // P2-3: snapshot pre-save LLM config (no secrets)
      const previous = StorageService.getLLMConfig(this.llm.provider);
      pushSettingsRollbackSnapshot('llm', {
        provider: this.llm.provider,
        config: previous ? { ...previous, apiKey: '' } : { ...newConfig, apiKey: '' },
      });

      // API Key secured separately; remaining config via SettingsDomain facade
      await saveSettingsDomainPartition('llm', {
        provider: this.llm.provider,
        config: newConfig,
        apiKey: this.llm.apiKey,
      });

      // Update global status UI
      updateModelStatus();

      showToast('LLM 配置已保存', { type: 'success' });
      this.captureSettingsBaseline();
      // Keep panel open after save — user may continue editing other sections.
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'saveProviderConfig', module: 'settings' });
    }
  },

  setLlmProvider(event: Event): void {
    this.llm.provider = (event.target as HTMLSelectElement).value;
  },

  setLlmEndpoint(event: Event): void {
    this.llm.endpoint = (event.target as HTMLInputElement).value;
  },

  setLlmApiFamily(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const family: LlmApiFamilyId =
      raw === 'anthropic' || raw === 'gemini' || raw === 'openai' ? raw : 'openai';
    this.llm.apiPath = apiPathIdForFamily(family);
    this.llmApiPathMenuOpen = false;
  },

  setLlmApiPath(event: Event): void {
    // Legacy select hook: still normalize, but UI now drives path via family.
    this.llm.apiPath = normalizeApiPathId((event.target as HTMLSelectElement).value);
    this.llmApiPathMenuOpen = false;
  },

  setLlmApiPathId(id: string): void {
    this.llm.apiPath = normalizeApiPathId(id);
    this.llmApiPathMenuOpen = false;
  },

  setLlmApiKey(event: Event): void {
    this.llm.apiKey = (event.target as HTMLInputElement).value;
  },

  setLlmModel(event: Event): void {
    this.llm.model = (event.target as HTMLSelectElement).value;
    this.clampReasoningPrefsToActiveModel({ announce: true, persist: true });
  },

  setLlmServiceTier(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.llm.serviceTier = value
      ? (value as NonNullable<LLMProviderConfig['serviceTier']>)
      : undefined;
  },

  setReasoningEnabled(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.llm.reasoningPrefs = {
      ...normalizeReasoningUserPrefs(this.llm.reasoningPrefs),
      enabled: checked,
    };
    void this.autoSaveProviderConfig('推理设置已保存');
  },

  setReasoningEffort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.setReasoningEffortLevel(value);
  },

  setReasoningEffortLevel(level: ReasoningEffortLevel | string): void {
    const raw = isReasoningEffortLevel(level) ? level : DEFAULT_REASONING_PREFS.effort;
    // Only persist efforts the current model can actually send (nearest-tier clamp).
    const allowed = this.reasoningEffortOptions;
    const effort = allowed.length > 0 ? clampEffort(raw, allowed) : DEFAULT_REASONING_PREFS.effort;
    this.llm.reasoningPrefs = {
      ...normalizeReasoningUserPrefs(this.llm.reasoningPrefs),
      effort,
    };
    void this.autoSaveProviderConfig('推理等级已保存');
  },

  /**
   * Instant-save LLM config for button/switch controls (no panel close).
   * Requires endpoint+model (from form or last saved config).
   * `silent: true` skips success toast (used when demotion toast already shown).
   */
  async autoSaveProviderConfig(
    successToast: string,
    options?: { silent?: boolean }
  ): Promise<void> {
    try {
      const previous = StorageService.getLLMConfig(this.llm.provider);
      const newConfig = buildAutoSaveLlmConfig(this.llm, previous);
      if (!newConfig.endpoint || !newConfig.model) {
        if (!options?.silent) {
          showToast('请先配置 Endpoint 与模型后再保存推理设置', { type: 'warning' });
        }
        return;
      }
      pushSettingsRollbackSnapshot('llm', {
        provider: this.llm.provider,
        config: previous ? { ...previous, apiKey: '' } : { ...newConfig },
      });
      await saveSettingsDomainPartition('llm', { provider: this.llm.provider, config: newConfig });
      updateModelStatus();
      this.captureSettingsBaseline();
      if (!options?.silent) {
        showToast(successToast, { type: 'success' });
      }
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'autoSaveProviderConfig',
        module: 'settings',
      });
    }
  },

  async toggleLlmKeyVisibility(): Promise<void> {
    if (this.llm.showKey) {
      this.llm.showKey = false;
      return;
    }
    const confirmed = await confirmWithModal(
      '\u663e\u793a API Key',
      'API Key \u5c06\u4ee5\u660e\u6587\u5c55\u793a\uff1b\u540c\u6e90\u811a\u672c\u4e0e\u6d4f\u89c8\u5668\u6269\u5c55\u5747\u53ef\u8bfb\u53d6\u672c\u673a\u5b58\u50a8\uff0c\u5171\u4eab\u7535\u8111\u8bf7\u52ff\u5c55\u793a\u6216\u590d\u5236\u3002',
      '',
      '\u663e\u793a'
    );
    if (confirmed) {
      this.llm.showKey = true;
    }
  },

  getModelValue(model: ModelOption): string {
    return getModelId(model);
  },

  getModelLabel(model: ModelOption): string {
    return this.getModelValue(model);
  },

  isModelSelected(model: ModelOption): boolean {
    return this.getModelValue(model) === this.llm.model;
  },
};
