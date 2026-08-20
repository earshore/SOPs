/**
 * filterCommands.ts - 命令面板与统一搜索框的匹配/排序核心（纯函数，无 DOM 依赖）
 *
 * 匹配算法由 search.ts 的 routeMatchesQuery 扩展而来，保证新旧搜索口径一致：
 * 1. 查询按空白切分为多键，所有键必须命中（AND 语义），支持 "导出 设置" 组合查询
 * 2. 单键命中范围：label / moduleLabel / category / keywords（完整子串 +
 *    label 首字母缩写，与 routeMatchesQuery 的首字母策略一致）
 * 3. 排序：输入为空时 recent 置顶（按执行时间倒序，其余保持索引序）；
 *    有输入时按首键命中质量排序（label 命中 > 首字母命中 > 其他命中）
 */
import type { CommandItem, RecentItem, SearchIndexItem } from './types';

export interface FilterOptions {
  /** 最近使用记录（localStorage 读出），输入为空时置顶展示。 */
  recent?: RecentItem[];
  /** recent 置顶上限，默认 8。 */
  maxRecent?: number;
  /** 单模块过滤（SearchBox 用，面板固定为空）。 */
  moduleId?: string;
  /** 输入为空时是否保留 recent 组，默认 true（面板），SearchBox 可置 false。 */
  showRecentWhenEmpty?: boolean;
}

interface MatchScore {
  item: CommandItem;
  /** 首键命中质量：label 完整子串=3，首字母缩写=2，其他（模块/类别/关键词）=1。 */
  quality: number;
  /** 首键命中位置（越小越靠前，未命中按 Infinity 处理）。 */
  position: number;
}

const DEFAULT_MAX_RECENT = 8;

/** 返回 label 的首字母缩写，如 "新品生命周期跟踪" → "xpsmtxg"。 */
export function initialsOf(label: string): string {
  return label
    .split(/[\s-]+/)
    .map(word => word[0] ?? '')
    .join('')
    .toLowerCase();
}

function itemMatchText(item: SearchIndexItem): {
  label: string;
  rest: string[];
} {
  const label = (item.label ?? '').toLowerCase();
  const rest = [
    (item.moduleLabel ?? '').toLowerCase(),
    (item.category ?? '').toLowerCase(),
    ...(item.keywords ?? []).map(k => k.toLowerCase()),
  ];
  return { label, rest };
}

/** 单键命中质量与位置；未命中返回 null。 */
function scoreKey(
  item: SearchIndexItem,
  key: string
): { quality: number; position: number } | null {
  if (!key) {
    return null;
  }
  const { label, rest } = itemMatchText(item);
  const labelPos = label.indexOf(key);
  if (labelPos >= 0) {
    return { quality: 3, position: labelPos };
  }
  const abbr = initialsOf(item.label);
  if (abbr.includes(key)) {
    return { quality: 2, position: abbr.indexOf(key) };
  }
  for (const text of rest) {
    const pos = text.indexOf(key);
    if (pos >= 0) {
      return { quality: 1, position: pos };
    }
  }
  return null;
}

/** 多键 AND 匹配：所有键都命中且首键决定排序质量。 */
function matchAll(item: CommandItem, keys: string[]): MatchScore | null {
  const firstKey = keys[0];
  if (!firstKey) {
    return null;
  }
  const first = scoreKey(item, firstKey);
  if (!first) {
    return null;
  }
  for (let i = 1; i < keys.length; i += 1) {
    const key = keys[i];
    if (!key || !scoreKey(item, key)) {
      return null;
    }
  }
  return { item, ...first };
}

function recentMap(recent: RecentItem[] | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!recent) {
    return map;
  }
  for (const entry of recent) {
    const prev = map.get(entry.id);
    if (prev === undefined || entry.at > prev) {
      map.set(entry.id, entry.at);
    }
  }
  return map;
}

/** 按质量降序、位置升序、原始索引序稳定排序。 */
function sortMatches(matches: MatchScore[]): MatchScore[] {
  return matches.sort((a, b) => {
    if (b.quality !== a.quality) {
      return b.quality - a.quality;
    }
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return 0;
  });
}

/**
 * 过滤并排序命令条目。
 * - 输入为空：recent 置顶（上限 maxRecent），其余按索引序返回
 * - 输入非空：多键 AND 匹配，按命中质量排序
 */
export function filterCommands(
  items: CommandItem[],
  query: string,
  options: FilterOptions = {}
): CommandItem[] {
  const maxRecent = options.maxRecent ?? DEFAULT_MAX_RECENT;
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    const recent = recentMap(options.recent);
    const topRecent: CommandItem[] = [];
    const rest: CommandItem[] = [];
    const recentIds = [...recent.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxRecent)
      .map(entry => entry[0]);
    for (const item of items) {
      if (recentIds.includes(item.id)) {
        topRecent.push(item);
      } else {
        rest.push(item);
      }
    }
    if (options.showRecentWhenEmpty !== false && recentIds.length > 0) {
      const byTime = [...topRecent].sort((a, b) => {
        const atA = recent.get(a.id) ?? 0;
        const atB = recent.get(b.id) ?? 0;
        return atB - atA;
      });
      return [...byTime, ...rest];
    }
    // 不展示 recent 分组时保持原始索引序（动作条目位于路由之后）。
    return [...items];
  }

  const keys = normalizedQuery.toLowerCase().split(/\s+/).filter(Boolean);
  if (keys.length === 0) {
    return items;
  }
  let scoped = items;
  if (options.moduleId) {
    scoped = items.filter(item => item.kind !== 'action' && item.moduleId === options.moduleId);
  }
  const matches = scoped
    .map(item => matchAll(item, keys))
    .filter((m): m is MatchScore => m !== null);
  return sortMatches(matches).map(m => m.item);
}

/** 记录一次执行到 recent 列表（localStorage 读写抽离，便于测试）。 */
export function writeRecentEntry(
  recent: RecentItem[],
  id: string,
  maxRecent = DEFAULT_MAX_RECENT,
  now = Date.now()
): RecentItem[] {
  const filtered = recent.filter(entry => entry.id !== id);
  return [{ id, at: now }, ...filtered].slice(0, maxRecent);
}
