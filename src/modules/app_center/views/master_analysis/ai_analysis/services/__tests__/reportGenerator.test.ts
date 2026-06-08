import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateJsonReportData, generateMarkdownReport } from '../reportGenerator';
import type { AnalysisResult } from '../../types';

const listingResult: AnalysisResult = {
  targetId: 'listing-quality',
  title: 'Listing 质量',
  source: 'Listings',
  stats: [{ label: '标题长度', value: '128' }],
  highlights: [{ text: '标题覆盖核心关键词', type: 'success' }],
  details: [{ category: '标题', items: ['保留核心词', '减少重复词'] }]
};

const reviewResult: AnalysisResult = {
  targetId: 'review-insights',
  title: 'Review 洞察',
  source: 'Reviews',
  stats: [],
  highlights: [{ text: '用户关注安装便利性', type: 'info' }],
  details: []
};

describe('reportGenerator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates markdown sections for listings and reviews', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-09T08:30:00+08:00'));

    const markdown = generateMarkdownReport(
      [listingResult, reviewResult],
      ['B001', 'B002'],
      'DE',
      'Scraper'
    );

    expect(markdown).toContain('# AI 智能分析报告');
    expect(markdown).toContain('**产品 ASIN**: B001, B002');
    expect(markdown).toContain('**市场**: DE');
    expect(markdown).toContain('**数据源**: Scraper');
    expect(markdown).toContain('## 📦 Listings 分析');
    expect(markdown).toContain('### Listing 质量');
    expect(markdown).toContain('- 标题长度: 128');
    expect(markdown).toContain('- 标题覆盖核心关键词');
    expect(markdown).toContain('#### 标题');
    expect(markdown).toContain('- 保留核心词');
    expect(markdown).toContain('## ⭐ Reviews 分析');
    expect(markdown).toContain('### Review 洞察');
    expect(markdown).toContain('- 用户关注安装便利性');
  });

  it('omits empty analysis sections', () => {
    const markdown = generateMarkdownReport([listingResult], ['B001'], 'US', 'Fixture');

    expect(markdown).toContain('## 📦 Listings 分析');
    expect(markdown).not.toContain('## ⭐ Reviews 分析');
  });

  it('generates json report metadata', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-09T08:30:00.000Z'));

    const report = generateJsonReportData(['B001'], ['listing-quality'], 'scraper', 'DE', {
      ok: true
    });

    expect(report).toEqual({
      metadata: {
        asins: ['B001'],
        targets: ['listing-quality'],
        timestamp: '2026-06-09T08:30:00.000Z',
        dataSource: 'scraper',
        marketplace: 'DE'
      },
      analysisReport: { ok: true }
    });
  });
});
