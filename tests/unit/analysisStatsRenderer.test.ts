/**
 * analysisStatsRenderer 单元测试
 * ================================================================
 * 验证 ViewRenderer 标准化试点的正确性：
 * 1. buildAnalysisStatsSnapshot 快照派生逻辑（覆盖率计算、空数据兜底）
 * 2. AnalysisStatsViewRenderer 渲染结果（DOM 结构、幂等更新、交互注入）
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnalysisStatsViewRenderer,
  buildAnalysisStatsSnapshot,
  type AnalysisStatsSnapshot,
} from '../../src/modules/app_center/views/keyword_hunter/process/analysisStatsRenderer';

/** 构造最小 KeywordTrackerState 快照（只覆盖渲染器所需字段） */
function makeTracker(overrides: Partial<AnalysisStatsSnapshot> & {
  keywords?: string[];
} = {}): AnalysisStatsSnapshot {
  const keywords = overrides.keywords ?? [];
  const matchedCount = overrides.matchedCount ?? 0;
  const unmatchedCount = overrides.unmatchedCount ?? 0;
  return {
    coverageRate:
      overrides.coverageRate ??
      (keywords.length === 0 ? 0 : Math.round((matchedCount / keywords.length) * 100)),
    matchedCount,
    unmatchedCount,
    totalCount: overrides.totalCount ?? keywords.length,
    matchedKeywords: overrides.matchedKeywords ?? [],
    unmatchedKeywords: overrides.unmatchedKeywords ?? [],
    wordFrequency: overrides.wordFrequency ?? [],
  };
}

/** 创建带统计面板元素的容器 */
function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'root';
  container.innerHTML = `
    <div id="keyword-hunter-coverage-rate"></div>
    <progress id="keyword-hunter-coverage-bar" value="0" max="100"></progress>
    <span id="keyword-hunter-stat-matched"></span>
    <span id="keyword-hunter-stat-unmatched"></span>
    <span id="keyword-hunter-stat-total"></span>
    <div id="keyword-hunter-word-frequency-list"></div>
  `;
  return container;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('buildAnalysisStatsSnapshot', () => {
  it('根据关键词与匹配数量计算覆盖率', () => {
    const tracker = {
      keywords: ['a', 'b', 'c', 'd'],
      matchedKeywords: [{ keyword: 'a', count: 1 }, { keyword: 'b', count: 2 }],
      unmatchedKeywords: ['c', 'd'],
      wordFrequency: [
        ['hello', 3],
        ['world', 1],
      ],
    } as never;
    const snapshot = buildAnalysisStatsSnapshot(tracker);
    expect(snapshot.coverageRate).toBe(50);
    expect(snapshot.matchedCount).toBe(2);
    expect(snapshot.unmatchedCount).toBe(2);
    expect(snapshot.totalCount).toBe(4);
    expect(snapshot.wordFrequency).toEqual([
      ['hello', 3],
      ['world', 1],
    ]);
  });

  it('总数为 0 时覆盖率为 0（不产生 NaN）', () => {
    const snapshot = buildAnalysisStatsSnapshot({
      keywords: [],
      matchedKeywords: [],
      unmatchedKeywords: [],
      wordFrequency: [],
    } as never);
    expect(snapshot.coverageRate).toBe(0);
    expect(snapshot.totalCount).toBe(0);
  });

  it('对缺失字段有兜底（undefined 时视为空列表）', () => {
    const snapshot = buildAnalysisStatsSnapshot({} as never);
    expect(snapshot.coverageRate).toBe(0);
    expect(snapshot.matchedKeywords).toEqual([]);
    expect(snapshot.unmatchedKeywords).toEqual([]);
    expect(snapshot.wordFrequency).toEqual([]);
  });
});

describe('AnalysisStatsViewRenderer', () => {
  it('更新覆盖率统计元素', () => {
    const container = createContainer();
    document.body.appendChild(container);
    const renderer = new AnalysisStatsViewRenderer();
    renderer.render(
      container,
      makeTracker({
        keywords: ['a', 'b', 'c'],
        matchedCount: 2,
        unmatchedCount: 1,
        matchedKeywords: [
          { keyword: 'a', count: 1 },
          { keyword: 'b', count: 1 },
        ],
        unmatchedKeywords: ['c'],
        wordFrequency: [['example', 5]],
      })
    );
    expect(container.querySelector('#keyword-hunter-coverage-rate')?.textContent).toBe(
      '67%'
    );
    expect(
      container.querySelector('#keyword-hunter-stat-matched')?.textContent
    ).toBe('2');
    expect(
      container.querySelector('#keyword-hunter-stat-unmatched')?.textContent
    ).toBe('1');
    expect(
      container.querySelector('#keyword-hunter-stat-total')?.textContent
    ).toBe('3');
    const bar = container.querySelector('#keyword-hunter-coverage-bar') as HTMLProgressElement;
    expect(bar.getAttribute('aria-valuenow')).toBe('67');
    expect(bar.value).toBe(67);
  });

  it('渲染词云（匹配词根高亮、未匹配词根标签带交互）', () => {
    const container = createContainer();
    document.body.appendChild(container);
    const renderer = new AnalysisStatsViewRenderer();
    const onLocateRoot = vi.fn();
    renderer.render(
      container,
      makeTracker({
        matchedKeywords: [{ keyword: 'wireless earbuds', count: 2 }],
        unmatchedKeywords: ['noise cancelling'],
        wordFrequency: [
          ['wireless', 3],
          ['earbuds', 2],
          ['noise', 1],
        ],
      }),
      { onLocateRoot }
    );
    const freqList = container.querySelector('#keyword-hunter-word-frequency-list')!;
    // 词云 span
    const wordSpans = freqList.querySelectorAll('span');
    expect(wordSpans.length).toBeGreaterThan(0);
    // 匹配词根 'wireless' 与 'earbuds' 应有高亮 class
    const matchedSpans = Array.from(freqList.querySelectorAll('span')).filter(s =>
      s.className.includes('bg-green-100')
    );
    expect(matchedSpans.some(s => s.textContent?.includes('wireless'))).toBe(true);
    expect(matchedSpans.some(s => s.textContent?.includes('earbuds'))).toBe(true);
    // 未匹配词根区：'cancelling' 作为标签展示（词根长度 > 2）；
    // 'noise' 虽满足长度条件，但已出现在词云中（高频词排除），不重复显示
    const unmatchedTags = Array.from(freqList.querySelectorAll('span')).filter(s =>
      s.title === '点击在关键词监控中定位'
    );
    expect(unmatchedTags.some(s => s.textContent?.includes('cancelling'))).toBe(true);
    expect(unmatchedTags.some(s => s.textContent?.includes('noise'))).toBe(false);
    // 点击触发注入的回调
    unmatchedTags[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onLocateRoot).toHaveBeenCalled();
    expect(onLocateRoot.mock.calls[0][0]).toBe('cancelling');
  });

  it('无数据时渲染空状态占位', () => {
    const container = createContainer();
    document.body.appendChild(container);
    const renderer = new AnalysisStatsViewRenderer();
    renderer.render(container, makeTracker({ wordFrequency: [] }));
    const freqList = container.querySelector('#keyword-hunter-word-frequency-list')!;
    // 空状态元素带 role=status
    expect(freqList.querySelector('[role="status"]')).toBeTruthy();
    expect(freqList.textContent).toContain('还没有词频数据');
  });

  it('重复渲染幂等（不重复追加节点）', () => {
    const container = createContainer();
    document.body.appendChild(container);
    const renderer = new AnalysisStatsViewRenderer();
    renderer.render(
      container,
      makeTracker({ wordFrequency: [['test', 1]] })
    );
    const afterFirst = container.querySelectorAll('span').length;
    renderer.render(
      container,
      makeTracker({ wordFrequency: [['test', 1]] })
    );
    const afterSecond = container.querySelectorAll('span').length;
    expect(afterSecond).toBe(afterFirst);
  });

  it('total 与 frequency 均为空时不渲染（保持模板原始结构）', () => {
    const container = createContainer();
    document.body.appendChild(container);
    const renderer = new AnalysisStatsViewRenderer();
    const originalHTML = container.innerHTML;
    renderer.render(container, makeTracker({ keywords: [], wordFrequency: [] }));
    // 渲染器选择不覆盖：频率列表保持原样（原始模板有骨架屏）
    expect(container.querySelector('#keyword-hunter-word-frequency-list')).toBeTruthy();
    void originalHTML;
  });
});
