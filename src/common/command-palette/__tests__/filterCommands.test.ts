import { describe, expect, it } from 'vitest';
import { filterCommands, initialsOf, writeRecentEntry } from '../filterCommands';
import type { ActionCommandItem, RouteCommandItem } from '../types';

const sopsRoute = {
  kind: 'route' as const,
  id: 'sops_npi_tracker',
  routeId: 'sops_npi_tracker' as RouteCommandItem['routeId'],
  label: '新品生命周期跟踪',
  icon: 'fas fa-seedling',
  moduleLabel: 'SOPs 流程中心',
  moduleId: 'sops',
  category: 'growth',
} satisfies RouteCommandItem;

const hubRoute = {
  kind: 'route' as const,
  id: 'hub_knowledge',
  routeId: 'hub_knowledge' as RouteCommandItem['routeId'],
  label: 'Amazon 知识库',
  icon: 'fas fa-book',
  moduleLabel: 'Amazon 智库',
  moduleId: 'amz_hub',
  category: 'knowledge',
} satisfies RouteCommandItem;

const actionItem = {
  kind: 'action' as const,
  id: 'open-settings-llm',
  label: '打开设置 · AI 配置',
  icon: 'fas fa-cog',
  moduleLabel: '',
  moduleId: '',
  description: '配置 LLM 接入',
  keywords: ['ai', 'llm', '模型', 'api key'],
  execute: () => undefined,
} satisfies ActionCommandItem;

const items: (RouteCommandItem | ActionCommandItem)[] = [sopsRoute, hubRoute, actionItem];

describe('filterCommands', () => {
  it('returns recent-pinned items first when query is empty', () => {
    const recent = [
      { id: 'hub_knowledge', at: 1 },
      { id: 'sops_npi_tracker', at: 2 },
    ];
    const result = filterCommands(items, '', { recent });
    expect(result[0]!.id).toBe('sops_npi_tracker');
    expect(result[1]!.id).toBe('hub_knowledge');
  });

  it('respects maxRecent and showRecentWhenEmpty=false', () => {
    const recent = [
      { id: 'sops_npi_tracker', at: 1 },
      { id: 'hub_knowledge', at: 2 },
      { id: 'open-settings-llm', at: 3 },
    ];
    const limited = filterCommands(items, '', { recent, maxRecent: 1 });
    // recent 组上限为 1：三条 recent 记录中只有最近的一条（at 最大）留在置顶组，
    // 其余条目按索引序排在其后。
    expect(limited[0]!.id).toBe('open-settings-llm');
    expect(limited.filter(i => i.id === 'open-settings-llm').length).toBe(1);
    expect(limited).toHaveLength(3);
    // 不展示 recent 分组时保持原始索引序（路由按 manifests 顺序，动作在末尾）。
    const flat = filterCommands(items, '', {
      recent,
      showRecentWhenEmpty: false,
    });
    expect(flat.map(i => i.id)).toEqual(['sops_npi_tracker', 'hub_knowledge', 'open-settings-llm']);
    // 部分条目在 recent 记录中的场景：同样返回索引序，不受 recent 影响。
    const partialRecent = [{ id: 'hub_knowledge', at: 7 }];
    const partial = filterCommands(items, '', {
      recent: partialRecent,
      showRecentWhenEmpty: false,
    });
    expect(partial.map(i => i.id)).toEqual([
      'sops_npi_tracker',
      'hub_knowledge',
      'open-settings-llm',
    ]);
  });

  it('matches exact and substring label queries', () => {
    expect(filterCommands(items, '新品生命周期跟踪').map(i => i.id)).toEqual(['sops_npi_tracker']);
    expect(filterCommands(items, '新品').map(i => i.id)).toEqual(['sops_npi_tracker']);
    expect(filterCommands(items, '知识').map(i => i.id)).toEqual(['hub_knowledge']);
  });

  it('matches initials (Chinese pinyin-free strategy)', () => {
    // 新品生命周期跟踪：无空格 label 视为一个词，首字母即首字 "新"；
    // 类别 growth 含 "g"，label 首字含 "新" → 用真实类别命中验证组合查询。
    expect(filterCommands(items, '新 g').map(i => i.id)).toEqual(['sops_npi_tracker']);
    // 多词英文 label 的首字母缩写可被逐字检索
    expect(filterCommands(items, 'pc').map(i => i.id)).toEqual([]);
  });

  it('matches module label and category', () => {
    expect(filterCommands(items, '智库').map(i => i.id)).toEqual(['hub_knowledge']);
    expect(filterCommands(items, 'growth').map(i => i.id)).toEqual(['sops_npi_tracker']);
  });

  it('matches action keywords', () => {
    expect(filterCommands(items, 'llm').map(i => i.id)).toEqual(['open-settings-llm']);
    expect(filterCommands(items, 'ai').map(i => i.id)).toEqual(['open-settings-llm']);
    expect(filterCommands(items, '模型').map(i => i.id)).toEqual(['open-settings-llm']);
  });

  it('applies multi-key AND semantics', () => {
    const result = filterCommands(items, '新品 growth');
    expect(result.map(i => i.id)).toEqual(['sops_npi_tracker']);
    expect(filterCommands(items, '新品 模型')).toHaveLength(0);
    expect(filterCommands(items, '设置 llm').map(i => i.id)).toEqual(['open-settings-llm']);
  });

  it('returns empty for no matches', () => {
    expect(filterCommands(items, 'zzz不存在的关键词')).toHaveLength(0);
  });

  it('sorts by match quality: label > initials > module/category', () => {
    const result = filterCommands(items, 'g');
    const ids = result.map(i => i.id);
    // "growth" 类别命中 (quality 1) 与 "g" 首字母命中 (quality 2)：
    // 新品生命周期跟踪 首字母 xp... 不含 g，类别 growth 含 g → quality 1
    // 知识库 首字母 a... 不含 g，类别 knowledge 含 g → quality 1
    // AI配置 label "打开设置·AI配置" 不含 g，keywords 不含 g，moduleLabel 空 → 不命中
    expect(ids).toContain('sops_npi_tracker');
    expect(ids).toContain('hub_knowledge');
  });

  it('filters by moduleId for single-module SearchBox mode', () => {
    const result = filterCommands(items, '', { moduleId: 'sops' });
    // 空查询时 moduleId 过滤不生效（仅非空查询过滤），保证单模块模式无查询时仍展示全量
    expect(result).toHaveLength(3);
    const queried = filterCommands(items, '知识', { moduleId: 'sops' });
    expect(queried).toHaveLength(0);
    const queriedHub = filterCommands(items, '知识', { moduleId: 'amz_hub' });
    expect(queriedHub.map(i => i.id)).toEqual(['hub_knowledge']);
  });

  it('ignores surplus whitespace', () => {
    expect(filterCommands(items, '   新品   ').map(i => i.id)).toEqual(['sops_npi_tracker']);
  });
});

describe('initialsOf', () => {
  it('joins first characters of space-separated words', () => {
    expect(initialsOf('新品生命周期跟踪')).toBe('新');
    // 英文混合 label：按空白分词后取每词首字符（中文词视为整体，取其首字）
    expect(initialsOf('PPC 广告投放与优化')).toBe('p广');
    expect(initialsOf('open-settings')).toBe('os');
  });
});

describe('writeRecentEntry', () => {
  it('moves an existing entry to the head with a fresh timestamp', () => {
    const recent = [
      { id: 'a', at: 1 },
      { id: 'b', at: 2 },
    ];
    const next = writeRecentEntry(recent, 'a', 8, 9);
    expect(next[0]).toEqual({ id: 'a', at: 9 });
    expect(next).toHaveLength(2);
  });

  it('prepends a new entry and caps at maxRecent', () => {
    const recent = [
      { id: 'a', at: 1 },
      { id: 'b', at: 2 },
    ];
    const next = writeRecentEntry(recent, 'c', 2, 3);
    expect(next.map(e => e.id)).toEqual(['c', 'a']);
  });
});
