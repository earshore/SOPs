// TD-SET-01 Phase 1: data section fragment (verbatim).
import { showToast } from '@/common/ui';
import { downloadJson } from '@/common/utils/download';
import { SECURE_STORAGE_SECURITY_BOUNDARY } from '@/common/utils/secureStorageBoundary';
import { chooseWithModal, confirmWithModal } from '@/components/modal/confirmModal';
import { isStorageQuotaWarning } from '@/components/settings/domain/settingsHealth';
import { ErrorService } from '@/services/errorService';
import {
  LOCAL_DATA_BUCKET_IDS,
  LocalDataStore,
  precheckLocalDataImportText,
  type LocalDataBucketId,
  type LocalDataExportSummary,
} from '@/services/localDataStore';
import { appStore } from '@/stores/useAppStore';

import {
  LOCAL_DATA_BUCKET_META,
  buildLocalDataExportConfirm,
  buildLocalDataImportChoiceContent,
  formatLocalDataBytes,
} from '../domain/localDataCopy';
import { LocalDataBucketView, SettingsPanelPart } from '../panelTypes';

async function resetAppStoreRuntimeState(): Promise<void> {
  const state = appStore.getState();

  state.resetScraper();
  state.resetAnalysis();
  state.resetPromptLab();
  state.resetKeywordTracker();
}

async function resetWorkspaceRuntimeState(): Promise<void> {
  await resetAppStoreRuntimeState();

  await LocalDataStore.clearBucket('workspace-state');
}

async function syncLocalDataRuntimeAfterBucketClear(bucketId: LocalDataBucketId): Promise<void> {
  if (bucketId === 'workspace-state') {
    await resetWorkspaceRuntimeState();
    return;
  }

  if (bucketId === 'scrape-history') {
    const { HistoryService } =
      await import('../../../modules/app_center/views/master_analysis/services/historyService');
    await HistoryService.clearAsync();
    return;
  }

  if (bucketId === 'chat-history') {
    const { clearDeepChatThreadStore } =
      await import('../../../modules/app_center/views/playground/deep-chat');
    await clearDeepChatThreadStore();
    return;
  }

  if (bucketId === 'keyword-history') {
    const { KeywordHunterSnapshotService } =
      await import('../../../modules/app_center/views/keyword_hunter/services/snapshotService');
    await KeywordHunterSnapshotService.clearAsync();
    return;
  }

  if (bucketId === 'app-center-history') {
    const { clearArtifactEnvelopeIndex } =
      await import('../../../modules/app_center/artifactEnvelopeService');
    const { clearRecentQueuePreferences } =
      await import('../../../modules/app_center/recentQueueService');
    clearArtifactEnvelopeIndex();
    clearRecentQueuePreferences();
  }
}

async function clearLocalDataBucketWithRuntimeSync(bucketId: LocalDataBucketId): Promise<number> {
  const removed = await LocalDataStore.clearBucket(bucketId);
  try {
    await syncLocalDataRuntimeAfterBucketClear(bucketId);
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'syncLocalDataRuntimeAfterBucketClear',
      module: 'settings',
      notify: false,
    });
  }
  return removed;
}

async function syncRuntimeAfterClearAllLocalData(): Promise<void> {
  try {
    await resetAppStoreRuntimeState();
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'resetAppStoreRuntimeState',
      module: 'settings',
      notify: false,
    });
  }

  const runtimeBuckets: LocalDataBucketId[] = ['scrape-history', 'chat-history', 'keyword-history'];
  for (const bucketId of runtimeBuckets) {
    try {
      await syncLocalDataRuntimeAfterBucketClear(bucketId);
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'syncRuntimeAfterClearAllLocalData',
        module: 'settings',
        notify: false,
      });
    }
  }

  await LocalDataStore.clearBucket('workspace-state');
}
const LOCAL_DATA_EXPORT_SIZE_WARN_BYTES = 2 * 1024 * 1024;
function reloadAfterLocalDataChange(): void {
  window.setTimeout(() => window.location.reload(), 800);
}

export function confirmSettingsAction(
  title: string,
  content: string,
  confirmLabel = '确认'
): Promise<boolean> {
  return confirmWithModal(title, content, '', confirmLabel);
}

export const dataSectionBehavior: SettingsPanelPart = {
  get localSecretBoundaryText(): string {
    return SECURE_STORAGE_SECURITY_BOUNDARY;
  },

  get localStorageUsedText(): string {
    return this.localData.usage
      ? this.formatBytes(this.localData.usage.localStorage.used)
      : '计算中';
  },

  get localStorageKeysText(): string {
    return this.localData.usage ? `${this.localData.usage.localStorage.keys} keys` : '';
  },

  get indexedDbUsedText(): string {
    return this.localData.usage ? this.formatBytes(this.localData.usage.indexedDB.used) : '计算中';
  },

  get indexedDbKeysText(): string {
    return this.localData.usage ? `${this.localData.usage.indexedDB.keys} records` : '';
  },

  get localDataCleanupSummaryText(): string {
    const total = this.localData.usage ? this.formatBytes(this.localData.usage.total) : '计算中';
    return `${this.localDataBucketItems.length} 类数据 · 总计 ${total}`;
  },

  get localDataCleanupToggleText(): string {
    return this.localData.cleanupItemsExpanded ? '收起项目清理' : '展开项目清理';
  },

  get localDataCleanupToggleIconClass(): string {
    return this.localData.cleanupItemsExpanded ? 'fa-chevron-up' : 'fa-chevron-down';
  },

  get isPartialLocalDataExport(): boolean {
    const selected = this.localData.selectedExportBuckets;
    return selected.length > 0 && selected.length < LOCAL_DATA_BUCKET_IDS.length;
  },

  get exportLocalDataButtonText(): string {
    return this.isPartialLocalDataExport ? '导出选中分类' : '导出全部备份';
  },

  get localDataBucketItems(): LocalDataBucketView[] {
    const usage = this.localData.usage;
    const total = usage?.total || 0;
    const buckets = usage?.buckets || [];

    return (Object.keys(LOCAL_DATA_BUCKET_META) as LocalDataBucketId[]).map(id => {
      const meta = LOCAL_DATA_BUCKET_META[id];
      const bucket = buckets.find(item => item.id === id);
      const used = bucket?.total || 0;
      const keys = (bucket?.localStorage.keys || 0) + (bucket?.indexedDB.keys || 0);
      const percent = total > 0 ? Math.round((used / total) * 100) : 0;
      const percentValue = used > 0 ? Math.max(percent, 3) : 0;

      return {
        id,
        ...meta,
        usedText: this.formatBytes(used),
        keysText: `${keys} 项`,
        percentText: `${percent}%`,
        percentWidth: `${percentValue}%`,
        percentValue,
        isEmpty: used <= 0 && keys === 0,
        isClearing: this.localData.clearingBucketId === id,
      };
    });
  },

  get storageUsageRatio(): number | undefined {
    if (!this.localData.usage) return undefined;
    const limit = 5 * 1024 * 1024;
    return this.localData.usage.localStorage.used / limit;
  },

  get quotaWarningVisible(): boolean {
    return isStorageQuotaWarning(this.storageUsageRatio);
  },

  async refreshLocalDataUsage(): Promise<void> {
    try {
      this.localData.usage = await LocalDataStore.getUsage();
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'refreshLocalDataUsage',
        module: 'settings',
        notify: false,
      });
    }
  },

  async exportLocalData(): Promise<void> {
    const selectedBuckets = this.isPartialLocalDataExport
      ? [...this.localData.selectedExportBuckets]
      : undefined;
    const confirmCopy = buildLocalDataExportConfirm(selectedBuckets);
    const confirmed = await confirmSettingsAction(
      confirmCopy.title,
      confirmCopy.content,
      '继续导出'
    );
    if (!confirmed) return;

    try {
      this.localData.isBusy = true;
      const data = await LocalDataStore.exportAll(
        selectedBuckets ? { buckets: selectedBuckets } : {}
      );
      const payload = JSON.stringify(data, null, 2);
      const estimatedBytes = payload.length * 2;
      if (estimatedBytes >= LOCAL_DATA_EXPORT_SIZE_WARN_BYTES) {
        const sizeConfirmed = await confirmSettingsAction(
          '备份体积较大',
          `本次备份预估约 ${formatLocalDataBytes(estimatedBytes)}，下载与后续导入可能较慢。仍要导出？`,
          '继续导出'
        );
        if (!sizeConfirmed) return;
      }

      const suffix = selectedBuckets ? `-partial-${selectedBuckets.join('-')}` : '';
      downloadJson(
        `sops-local-data${suffix}-${new Date().toISOString().slice(0, 10)}.json`,
        payload
      );
      showToast(selectedBuckets ? '分桶本地数据已导出' : '本地数据已导出', { type: 'success' });
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'exportLocalData', module: 'settings' });
    } finally {
      this.localData.isBusy = false;
    }
  },

  async importLocalData(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        this.localData.isBusy = true;
        const text = await file.text();
        let prechecked: {
          data: Parameters<typeof LocalDataStore.importAll>[0];
          summary: LocalDataExportSummary;
        };
        try {
          prechecked = precheckLocalDataImportText(text);
        } catch (error) {
          ErrorService.handle(error as Error, { action: 'importLocalData', module: 'settings' });
          return;
        }

        const choice = await chooseWithModal({
          title: '导入本地数据',
          content: buildLocalDataImportChoiceContent(prechecked.summary),
          primaryLabel: '完整恢复',
          secondaryLabel: '合并导入',
          cancelLabel: '取消',
          primaryIsDestructive: true,
        });

        if (choice === 'cancel') {
          return;
        }

        const mode = choice === 'primary' ? 'replace' : 'merge';
        await LocalDataStore.importAll(prechecked.data, { mode });
        await this.refreshLocalDataUsage();
        showToast('本地数据已导入，页面即将刷新以应用恢复结果', { type: 'success' });
        reloadAfterLocalDataChange();
      } catch (error) {
        ErrorService.handle(error as Error, { action: 'importLocalData', module: 'settings' });
      } finally {
        this.localData.isBusy = false;
      }
    });
    input.click();
  },

  toggleLocalDataCleanupItems(): void {
    this.localData.cleanupItemsExpanded = !this.localData.cleanupItemsExpanded;
  },

  isExportBucketSelected(bucketId: LocalDataBucketId): boolean {
    return this.localData.selectedExportBuckets.includes(bucketId);
  },

  toggleExportBucket(bucketId: LocalDataBucketId): void {
    const selected = this.localData.selectedExportBuckets;
    if (selected.includes(bucketId)) {
      this.localData.selectedExportBuckets = selected.filter(id => id !== bucketId);
      return;
    }
    this.localData.selectedExportBuckets = [...selected, bucketId];
  },

  selectAllExportBuckets(): void {
    this.localData.selectedExportBuckets = [...LOCAL_DATA_BUCKET_IDS];
  },

  clearExportBucketSelection(): void {
    this.localData.selectedExportBuckets = [];
  },

  async clearLocalCache(): Promise<void> {
    await this.clearLocalDataBucket('cache');
  },

  async clearLocalDataBucket(bucketId: LocalDataBucketId): Promise<void> {
    const meta = LOCAL_DATA_BUCKET_META[bucketId];
    if (!meta) return;

    if (meta.confirmMessage) {
      const confirmed = await confirmSettingsAction(
        meta.actionLabel,
        meta.confirmMessage,
        meta.actionLabel
      );
      if (!confirmed) return;
    }

    try {
      this.localData.isBusy = true;
      this.localData.clearingBucketId = bucketId;
      const removed = await clearLocalDataBucketWithRuntimeSync(bucketId);
      await this.refreshLocalDataUsage();
      showToast(`${meta.label}已清理 (${removed} 项)`, { type: 'success' });
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'clearLocalDataBucket', module: 'settings' });
    } finally {
      this.localData.isBusy = false;
      this.localData.clearingBucketId = null;
    }
  },

  async clearAllLocalData(): Promise<void> {
    const confirmed = await confirmSettingsAction(
      '清空全部本地数据',
      '这会删除本浏览器中的配置、密钥、采集历史、聊天记录和缓存。请先导出备份。继续？',
      '继续'
    );
    if (!confirmed) return;
    const confirmedAgain = await confirmSettingsAction(
      '二次确认',
      '二次确认：清空后无法恢复，除非你已有导出的备份文件。确定清空全部本地数据？',
      '清空全部'
    );
    if (!confirmedAgain) return;

    try {
      this.localData.isBusy = true;
      await LocalDataStore.clearAll();
      await syncRuntimeAfterClearAllLocalData();
      this.localData.usage = await LocalDataStore.getUsage();
      showToast('全部本地数据已清空，页面即将刷新以应用清理结果', { type: 'success' });
      reloadAfterLocalDataChange();
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'clearAllLocalData', module: 'settings' });
    } finally {
      this.localData.isBusy = false;
    }
  },

  formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  },
};
