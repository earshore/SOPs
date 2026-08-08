// src/components/settings/domain/localDataCopy.ts
// ================================================================
// Settings local-data copy helpers (bucket meta, export/import copy).
// Extracted from systemSettings so the panel stays focused on state.
// ================================================================

import { SECURE_STORAGE_SECURITY_BOUNDARY } from '@/common/utils/secureStorageBoundary';
import type { LocalDataBucketId, LocalDataExportSummary } from '@/services/localDataStore';
export type ModelMetadata = {
  id: string;
  name?: string;
  context?: number;
  features?: string[];
};

export type ModelOption = string | ModelMetadata;

export interface LocalDataBucketMeta {
  label: string;
  description: string;
  icon: string;
  iconClass: string;
  buttonClass: string;
  actionLabel: string;
  confirmMessage: string | null;
}
export const LOCAL_DATA_BUCKET_META: Record<LocalDataBucketId, LocalDataBucketMeta> = {
  config: {
    label: '系统配置与偏好',
    description: 'AI 连接、工具策略、网络、布局和功能开关',
    icon: 'fa-sliders-h',
    iconClass: 'bg-blue-50 text-blue-600 ring-blue-100',
    buttonClass: 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100',
    actionLabel: '清理配置',
    confirmMessage: '这会删除模型、网络、布局和偏好配置，保留历史、聊天与缓存。继续？',
  },
  secrets: {
    label: '密钥与凭据',
    description: '浏览器本地混淆保存的 API Key 与代理凭据（非服务端加密）',
    icon: 'fa-key',
    iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
    buttonClass: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100',
    actionLabel: '清理密钥',
    confirmMessage: '这会删除本浏览器保存的 API Key，之后需要重新配置。继续？',
  },
  'workspace-state': {
    label: '工作台临时状态',
    description: '页面状态、草稿、PromptLab 与关键词工具工作区',
    icon: 'fa-layer-group',
    iconClass: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
    buttonClass: 'border-cyan-100 bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
    actionLabel: '清理状态',
    confirmMessage:
      '这会重置本浏览器保存的工作台状态、草稿和工具输入，但保留模型配置、密钥、采集历史、聊天和缓存。继续？',
  },
  'scrape-history': {
    label: '采集与报告历史',
    description: '商品采集结果、导入记录和历史报告',
    icon: 'fa-clock-rotate-left',
    iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    buttonClass: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    actionLabel: '清理历史',
    confirmMessage: '这会删除本浏览器中的采集历史和历史报告，建议先导出备份。继续？',
  },
  'chat-history': {
    label: 'Deep Chat 聊天记录',
    description: 'Deep Chat 对话线程和消息上下文',
    icon: 'fa-comments',
    iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
    buttonClass: 'border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100',
    actionLabel: '清理聊天',
    confirmMessage: '这会删除 Deep Chat 本地聊天线程，建议先导出备份。继续？',
  },
  'keyword-history': {
    label: 'Keyword Hunter 历史',
    description: 'Keyword Hunter 快照、对比记录和迁移备份',
    icon: 'fa-magnifying-glass-chart',
    iconClass: 'bg-teal-50 text-teal-600 ring-teal-100',
    buttonClass: 'border-teal-100 bg-teal-50 text-teal-700 hover:bg-teal-100',
    actionLabel: '清理关键词',
    confirmMessage: '这会删除 Keyword Hunter 本地快照和历史对比记录，建议先导出备份。继续？',
  },
  'app-center-history': {
    label: '最近作业记录',
    description: '工作台总览的作业与工件记录（采集/AI 分析/Prompt/文案/评审等）',
    icon: 'fa-clock-rotate-left',
    iconClass: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    buttonClass: 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    actionLabel: '清理作业记录',
    confirmMessage: '这会删除工作台总览的最近作业记录（含置顶/移除偏好），建议先导出备份。继续？',
  },
  cache: {
    label: '缓存',
    description: '页面模板、HTTP 响应和 AI 分析缓存',
    icon: 'fa-broom',
    iconClass: 'bg-slate-100 text-slate-600 ring-slate-200',
    buttonClass: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    actionLabel: '清理缓存',
    confirmMessage: null,
  },
  other: {
    label: '未归类数据（谨慎）',
    description: '尚未归类的本地业务数据，清理前建议先导出备份',
    icon: 'fa-box-archive',
    iconClass: 'bg-rose-50 text-rose-600 ring-rose-100',
    buttonClass: 'border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100',
    actionLabel: '谨慎清理',
    confirmMessage: '这会删除尚未归类的本地数据，可能影响部分模块状态。建议先导出备份。继续？',
  },
};
export function formatLocalDataBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
export function buildLocalDataExportConfirm(selectedBuckets: string[] | undefined): {
  title: string;
  content: string;
} {
  if (selectedBuckets) {
    return {
      title: '导出分桶本地数据',
      content: `将仅导出已选分类（${selectedBuckets.join('、')}）。备份可能仍含敏感本地数据。${SECURE_STORAGE_SECURITY_BOUNDARY} 请仅保存在可信位置。继续导出？`,
    };
  }
  return {
    title: '导出本地数据',
    content: `导出的备份文件可能包含本地混淆保存的 API Key、代理凭据、配置和历史记录等敏感本地数据。${SECURE_STORAGE_SECURITY_BOUNDARY} 请仅保存在可信位置。继续导出？`,
  };
}
export function buildLocalDataImportChoiceContent(summary: LocalDataExportSummary): string {
  const lines = [
    '请选择导入方式。取消不会修改当前数据。',
    '',
    `导出时间：${summary.exportedAt}`,
    `存储版本：${summary.storageVersion}`,
    `localStorage：${summary.localStorageKeys} 项`,
    `IndexedDB：${summary.indexedDbRecords} 条记录`,
    `预估体积：约 ${formatLocalDataBytes(summary.estimatedBytes)}`,
    summary.includesSecrets
      ? '包含密钥/凭据：是（备份中可能含本地混淆保存的 API Key 或代理凭据）'
      : '包含密钥/凭据：否',
    '',
    '完整恢复：先清空当前本地数据，再写入备份（与备份一致）。',
    '合并导入：保留当前备份外的本地数据，用备份覆盖同名项。',
  ];
  return lines.join('\n');
}
// 收敛：与共享组件 modelSelectService.getModelId 语义一致（string→原样；对象→.id），
// 无额外 trim/fallback 语义，re-export 组件实现（P2 归一化）。
export { getModelId } from '@/components/modelSelect/modelSelectService';
