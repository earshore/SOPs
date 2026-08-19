// TD-SET-01 Phase 1: diagnostics section fragment (verbatim).
import { getDangerousEndpoints } from '@/common/config/apiEndpoints';
import { APP_VERSION } from '@/common/constants/constants';
import { showToast } from '@/common/ui';
import { initEventLogger } from '@/common/utils/eventLogger';
import {
  diffSettingsPartitions,
  snapshotSettingsPartitions,
  type SettingsDirtyPartition,
} from '@/components/settings/domain/settingsDirty';
import { evaluateSettingsHealth } from '@/components/settings/domain/settingsHealth';
import {
  evaluateExternalStorageChange,
  undoLastSettingsSave as popLastSettingsSave,
  type SettingsRollbackPartition,
} from '@/components/settings/domain/settingsRollback';
import {
  updateDeveloperDiagnosticSetting,
  type DeveloperDiagnosticSettings,
  type DeveloperLogLevel,
} from '@/services/developerDiagnosticsService';
import { ErrorService } from '@/services/errorService';
import {
  saveRuntimeStrategySettings,
  type RuntimeStrategySettings,
} from '@/services/runtimeStrategyService';
import {
  saveToolStrategySettings,
  type ToolStrategySettings,
} from '@/services/toolStrategyService';

import {
  LLMState,
  ProxyState,
  ToolStrategyState,
  RuntimeStrategyState,
  SettingsPanelPart,
} from '../panelTypes';

/** Plain partition payloads for dirty detection (excludes UI-only flags). */
function buildSettingsDirtyInput(panel: {
  llm: LLMState;
  toolStrategy: ToolStrategyState;
  runtimeStrategy: RuntimeStrategyState;
  proxy: ProxyState;
}): {
  llm: unknown;
  toolStrategy: unknown;
  runtime: unknown;
  proxy: unknown;
  appearance: unknown;
} {
  return {
    llm: {
      provider: panel.llm.provider,
      endpoint: panel.llm.endpoint,
      model: panel.llm.model,
      apiKey: panel.llm.apiKey,
      serviceTier: panel.llm.serviceTier,
      reasoningPrefs: panel.llm.reasoningPrefs,
      apiPath: panel.llm.apiPath,
    },
    toolStrategy: panel.toolStrategy.targetModels,
    runtime: panel.runtimeStrategy.settings,
    proxy: {
      type: panel.proxy.type,
      customUrl: panel.proxy.customUrl,
    },
    // Appearance is instant-write (theme/animation stores); never discard-dirty — Spec §5.5
    appearance: {},
  };
}

export const diagnosticsSectionBehavior: SettingsPanelPart = {
  get showDeveloperDiagnostics(): boolean {
    return !this.isProduction || this.developerDiagnostics.enableDebugMode;
  },

  get developerDangerousEndpointText(): string {
    return `${getDangerousEndpoints().length} 个危险端点需通过代理或企业网关访问`;
  },

  get settingsFooterStatusText(): string {
    if (this.healthMessages.length > 0) {
      return this.healthMessages[0] || '设置需要关注';
    }
    return '系统正常运行';
  },

  get settingsAppVersionLabel(): string {
    return `AihangSOP v${APP_VERSION}`;
  },

  refreshSettingsHealth(): void {
    const hasLlmEndpoint = Boolean((this.llm.endpoint || '').trim());
    const hasLlmKey = Boolean((this.llm.apiKey || '').trim());
    this.healthMessages = evaluateSettingsHealth({
      runtimeNormalized: this._runtimeHealthNormalized,
      hasLlmEndpoint,
      hasLlmKey,
      storageUsageRatio: this.storageUsageRatio,
    }).messages;
  },

  refreshRollbackUi(): void {
    // Alpine getters re-read sessionStorage; no-op hook for tests / future ticks.
  },

  handleStorageEvent(event: StorageEvent): void {
    const result = evaluateExternalStorageChange({
      key: event.key,
      isDirty: this.dirtyPartitions.length > 0,
    });
    if (!result) return;
    // P2-4: never auto-reload — only surface notice (conflict when dirty).
    this.externalChangeNotice = true;
    this.externalChangeConflict = result.conflict;
  },

  dismissExternalChangeNotice(): void {
    this.externalChangeNotice = false;
    this.externalChangeConflict = false;
  },

  async reloadFromExternalChange(): Promise<void> {
    this.dismissExternalChangeNotice();
    this.loadRuntimeStrategy();
    this.loadToolStrategyDefaults();
    await this.loadProviderConfig(this.llm.provider);
    await this.loadProxyConfig();
    this.captureSettingsBaseline();
    this.refreshSettingsHealth();
    void this.refreshLocalDataUsage().then(() => this.refreshSettingsHealth());
    showToast('已从其他标签页重新加载设置', { type: 'success' });
  },

  async undoLastSettingsSave(partition: SettingsRollbackPartition): Promise<void> {
    const payload = popLastSettingsSave(partition);
    if (payload == null) {
      showToast('没有可撤销的保存', { type: 'warning' });
      return;
    }

    try {
      if (partition === 'runtime') {
        saveRuntimeStrategySettings(payload as RuntimeStrategySettings);
        this.loadRuntimeStrategy();
      } else if (partition === 'toolStrategy') {
        saveToolStrategySettings(payload as ToolStrategySettings);
        this.loadToolStrategyDefaults();
      } else if (partition === 'llm') {
        await this.restoreLlmSettingsSnapshot(payload);
      }
      this.captureSettingsBaseline();
      this.refreshRollbackUi();
      showToast('已撤销上次保存', { type: 'success' });
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'undoLastSettingsSave',
        module: 'settings',
      });
    }
  },

  captureSettingsBaseline(): void {
    this._settingsBaseline = snapshotSettingsPartitions(buildSettingsDirtyInput(this));
  },

  get dirtyPartitions(): SettingsDirtyPartition[] {
    if (!this._settingsBaseline) return [];
    return diffSettingsPartitions(
      this._settingsBaseline,
      snapshotSettingsPartitions(buildSettingsDirtyInput(this))
    );
  },

  setDeveloperDiagnosticBoolean(
    key: keyof Omit<DeveloperDiagnosticSettings, 'loggerMinLevel'>,
    event: Event
  ): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.developerDiagnostics = updateDeveloperDiagnosticSetting(key, enabled);
    if (key === 'eventDebugEnabled' && enabled) {
      initEventLogger();
    }
  },

  setDeveloperDiagnosticLogLevel(event: Event): void {
    const level = (event.target as HTMLSelectElement).value as DeveloperLogLevel;
    this.developerDiagnostics = updateDeveloperDiagnosticSetting('loggerMinLevel', level);
  },
};
