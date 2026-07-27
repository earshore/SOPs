// src/components/settings/domain/settingsSearch.ts
// In-panel search index for system settings (labels + focus/runtime paths).

export interface SettingsSearchEntry {
  id: string;
  sectionId: string;
  labels: string[];
}

/**
 * Static search index. `id` is a DOM id or data-settings-focus value used to scroll/highlight.
 */
export const SETTINGS_SEARCH_INDEX: readonly SettingsSearchEntry[] = [
  {
    id: 'settings-section-llm',
    sectionId: 'settings-section-llm',
    labels: ['AI 模型与连接', 'Endpoint', 'API Key', '模型', '连接测试', '厂商'],
  },
  {
    id: 'settings-section-tool-strategy',
    sectionId: 'settings-section-tool-strategy',
    labels: ['工具策略', '默认模型', '运行策略', '通用 AI 执行策略', '重试'],
  },
  {
    id: 'settings-runtime-presets',
    sectionId: 'settings-section-tool-strategy',
    labels: [
      '运行策略预设',
      '运行策略一键预设',
      '全局档位',
      '预设',
      '稳定',
      '速度',
      '成本',
      '稳定优先',
      '速度优先',
      '成本优先',
      'reliability',
      'speed',
      'cost',
    ],
  },
  {
    id: 'master-analysis',
    sectionId: 'settings-section-tool-strategy',
    labels: [
      'Master Analysis',
      'master-analysis',
      '完整报告 Token',
      'tokenBudgetsByTarget',
      '分析缓存',
    ],
  },
  {
    id: 'keyword-hunter',
    sectionId: 'settings-section-tool-strategy',
    labels: [
      'Keyword Hunter',
      'keyword-hunter',
      'SEO 处理',
      'Listing 评审',
      '词干匹配',
      '复数匹配',
    ],
  },
  {
    id: 'ppc-analysis-flags',
    sectionId: 'settings-section-tool-strategy',
    labels: ['PPC Tools', 'ppc-analysis-flags', 'PPC 搜索词', '并发批次', 'Agent'],
  },
  {
    id: 'ppc-thresholds',
    sectionId: 'settings-section-tool-strategy',
    labels: [
      'ACOS',
      '目标 ACOS',
      '高 ACOS',
      'PPC 阈值',
      'ppc-thresholds',
      'targetAcos',
      'highAcos',
      '无单点击',
      '无单花费',
    ],
  },
  {
    id: 'settings-section-network',
    sectionId: 'settings-section-tool-strategy',
    labels: [
      '数据采集',
      '采集代理',
      '代理',
      '连接方式',
      'ScraperAPI',
      '采集运行策略',
      '最大并发',
      'Master Analysis 采集',
    ],
  },
  {
    id: 'settings-section-data',
    sectionId: 'settings-section-data',
    labels: ['数据与备份', '导出', '导入', '清理', 'localStorage', 'IndexedDB', '数据保留'],
  },
  {
    id: 'settings-section-appearance',
    sectionId: 'settings-section-appearance',
    labels: ['外观与体验', '主题', '动画', '减少动效', '动效'],
  },

  {
    id: 'settings-section-performance',
    sectionId: 'settings-section-performance',
    labels: ['开发者诊断', '性能监控', '调试配置'],
  },
] as const;

/** First entry whose labels contain the query (case-insensitive substring). */
export function findFirstSettingsSearchMatch(
  query: string,
  index: readonly SettingsSearchEntry[] = SETTINGS_SEARCH_INDEX
): SettingsSearchEntry | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const entry of index) {
    if (entry.labels.some(label => label.toLowerCase().includes(q))) {
      return entry;
    }
  }
  return null;
}
