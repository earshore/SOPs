// src/components/settings/domain/settingsSearch.ts
// In-panel search index for system settings (labels + focus/runtime paths).

export interface SettingsSearchEntry {
  id: string;
  sectionId: string;
  labels: string[];
}

/** UI row for the in-panel multi-hit search list. */
export interface SettingsSearchHitView {
  id: string;
  sectionId: string;
  title: string;
  sectionLabel: string;
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
    id: 'llm-step-1-title',
    sectionId: 'settings-section-llm',
    labels: ['基本信息', 'AI 厂商', '配置档', 'API 类型', 'Endpoint', 'API 路径'],
  },
  {
    id: 'llm-step-2-title',
    sectionId: 'settings-section-llm',
    labels: ['凭证', 'API Key', '密钥'],
  },
  {
    id: 'llm-step-3-title',
    sectionId: 'settings-section-llm',
    labels: ['模型与能力', '默认模型', '推理', '推理等级'],
  },
  {
    id: 'llm-step-4-title',
    sectionId: 'settings-section-llm',
    labels: ['服务层级', 'service_tier', 'Service Tier'],
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
      '应用策略预案',
      '策略预案',
      '运行策略预设',
      '运行策略一键预设',
      'LLM / 采集 / 分析 / Deep Chat / PPC',
      '全局档位',
      '预设',
      '默认',
      '稳定',
      '速度',
      '成本',
      '稳定优先',
      '速度优先',
      '成本优先',
      'default',
      'reliability',
      'speed',
      'cost',
    ],
  },
  {
    id: 'general-ai-runtime',
    sectionId: 'settings-section-tool-strategy',
    labels: ['通用 AI 执行策略', '超时', '重试', '连接测试超时', 'analysisTimeout'],
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
      '性能设置',
      '调度偏好',
      '证据深度',
      'evidenceDepth',
      '快速',
      '均衡',
      '深入',
    ],
  },
  {
    id: 'master-analysis-ai',
    sectionId: 'settings-section-tool-strategy',
    labels: ['AI 智能分析', '输出预算', '完整报告', '翻译报告', '性能设置', '证据深度'],
  },
  {
    id: 'playground-deep-chat',
    sectionId: 'settings-section-tool-strategy',
    labels: [
      'Playground',
      'Deep Chat',
      'Playground · Deep Chat',
      '业务工具',
      '启用 Vision',
      '图片上传',
      '输出 Token',
      '会话',
    ],
  },
  {
    id: 'deep-chat-business-tools-title',
    sectionId: 'settings-section-tool-strategy',
    labels: ['业务工具', '网页搜索', '搜索 X', '会话只读', 'enableBusinessTools'],
  },
  {
    id: 'deep-chat-vision-title',
    sectionId: 'settings-section-tool-strategy',
    labels: ['启用 Vision', 'Vision', '图片上传', 'enableVision', 'Alpha', '不稳定'],
  },
  {
    id: 'keyword-hunter',
    sectionId: 'settings-section-tool-strategy',
    labels: ['Keyword Hunter', 'keyword-hunter'],
  },
  {
    id: 'keyword-hunter-seo-process',
    sectionId: 'settings-section-tool-strategy',
    labels: ['SEO 处理', 'Keyword Hunter SEO', '逐行翻译', '词干匹配', '复数匹配'],
  },
  {
    id: 'keyword-hunter-listing-review',
    sectionId: 'settings-section-tool-strategy',
    labels: ['Listing 评审', 'Keyword Hunter Listing', '评审报告', '缓存'],
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
    id: 'master-analysis-scrape',
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
      'master-analysis-scrape',
    ],
  },
  {
    id: 'settings-section-network',
    sectionId: 'settings-section-tool-strategy',
    labels: ['settings-section-network', '采集网络', '网络采集'],
  },
  {
    id: 'settings-section-data',
    sectionId: 'settings-section-data',
    labels: ['数据与备份', '导出', '导入', '清理', 'localStorage', 'IndexedDB', '数据保留'],
  },
  {
    id: 'settings-export-buckets',
    sectionId: 'settings-section-data',
    labels: ['数据导入与导出', '导出备份', '导入备份', '分桶', 'export'],
  },
  {
    id: 'settings-data-retention',
    sectionId: 'settings-section-data',
    labels: ['数据保留策略', '历史保留条数', '缓存清理阈值', '缓存清理比例', '保存数据策略'],
  },
  {
    id: 'settings-data-cleanup-items',
    sectionId: 'settings-section-data',
    labels: ['项目清理', '清理项', '清理本地数据', '分桶清理'],
  },
  {
    id: 'settings-data-danger',
    sectionId: 'settings-section-data',
    labels: ['本地数据清空', '清空全部本地数据', '破坏性', '清空'],
  },
  {
    id: 'settings-section-appearance',
    sectionId: 'settings-section-appearance',
    labels: ['外观与体验', '外观', '体验'],
  },
  {
    id: 'settings-appearance-color-mode',
    sectionId: 'settings-section-appearance',
    labels: ['主题', '浅色', '深色', '跟随系统', 'color mode', 'appearance color'],
  },
  {
    id: 'settings-appearance-theme',
    sectionId: 'settings-section-appearance',
    labels: ['色调', '主题色', 'accent', 'theme preset'],
  },
  {
    id: 'settings-appearance-animation',
    sectionId: 'settings-section-appearance',
    labels: ['界面动画', '动画与动效', '动画', '启用动画', 'animation'],
  },
  {
    id: 'settings-appearance-reduced-motion',
    sectionId: 'settings-section-appearance',
    labels: ['动效偏好', '跟随系统动效偏好', '减少动效', '系统动效', 'prefers-reduced-motion'],
  },
  {
    id: 'settings-appearance-animation-speed',
    sectionId: 'settings-section-appearance',
    labels: ['动画速度', '动效速度', '快', '默认', '标准', '慢', 'animation speed'],
  },
  {
    id: 'settings-section-performance',
    sectionId: 'settings-section-performance',
    labels: [
      '开发者诊断',
      '性能监控',
      '调试配置',
      '监控',
      '调试采集',
      '实验特性',
      '日志级别',
      '监控与调试',
    ],
  },
] as const;

function scoreSettingsSearchLabel(label: string, query: string): number {
  const normalized = label.toLowerCase();
  if (normalized === query) return 100;
  if (normalized.startsWith(query)) return 80;
  const idx = normalized.indexOf(query);
  if (idx >= 0) {
    // Prefer earlier substring hits slightly.
    return Math.max(20, 50 - Math.min(idx, 20));
  }
  return 0;
}

function scoreSettingsSearchEntry(entry: SettingsSearchEntry, query: string): number {
  let best = 0;
  for (const label of entry.labels) {
    best = Math.max(best, scoreSettingsSearchLabel(label, query));
  }
  return best;
}

/** Ranked matches (exact > prefix > substring). Stable by index order on ties. */
export function findSettingsSearchMatches(
  query: string,
  index: readonly SettingsSearchEntry[] = SETTINGS_SEARCH_INDEX,
  limit = 8
): SettingsSearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ranked = index
    .map((entry, order) => ({ entry, order, score: scoreSettingsSearchEntry(entry, q) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order);
  return ranked.slice(0, Math.max(1, limit)).map(item => item.entry);
}

/** Best ranked entry whose labels match the query. */
export function findFirstSettingsSearchMatch(
  query: string,
  index: readonly SettingsSearchEntry[] = SETTINGS_SEARCH_INDEX
): SettingsSearchEntry | null {
  return findSettingsSearchMatches(query, index, 1)[0] ?? null;
}

const SECTION_LABEL_BY_ID: Record<string, string> = {
  'settings-section-llm': 'AI 模型与连接',
  'settings-section-tool-strategy': '工具策略',
  'settings-section-network': '工具策略 · 数据采集',
  'settings-section-data': '数据与备份',
  'settings-section-appearance': '外观与体验',
  'settings-section-performance': '开发者诊断',
};

/** Prefer the first intentional label (index authors put the product title first). */
export function pickSettingsSearchHitTitle(entry: SettingsSearchEntry): string {
  const preferred =
    entry.labels.find(label => label.trim() && !/^[a-z0-9._-]+$/i.test(label.trim())) ||
    entry.labels[0];
  return (preferred || entry.id).trim();
}

export function resolveSettingsSearchSectionLabel(sectionId: string): string {
  return SECTION_LABEL_BY_ID[sectionId] || sectionId;
}

export function toSettingsSearchHitViews(
  entries: readonly SettingsSearchEntry[]
): SettingsSearchHitView[] {
  return entries.map(entry => ({
    id: entry.id,
    sectionId: entry.sectionId,
    title: pickSettingsSearchHitTitle(entry),
    sectionLabel: resolveSettingsSearchSectionLabel(entry.sectionId),
  }));
}
