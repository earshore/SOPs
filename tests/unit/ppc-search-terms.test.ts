import { describe, expect, it } from 'vitest';
import {
  analyzeSearchTermReport,
  buildActionCsv,
  buildSummaryText,
  parseReport,
  type Thresholds,
} from '@/modules/app_center/views/ppc_search_terms/index';

const thresholds: Thresholds = {
  targetAcos: 35,
  highAcos: 55,
  minClicksNoOrder: 12,
  minSpendNoOrder: 15,
  minOrdersHarvest: 2,
  minCtr: 0.35,
};

describe('PPC 搜索词分析器', () => {
  it('兼容 Amazon Ads 常见表头并生成动作建议', () => {
    const report = [
      [
        'Campaign Name (Informational only)',
        'Ad Group Name (Informational only)',
        'Targeting (Informational only)',
        'Match Type (Informational only)',
        'Customer Search Term',
        'Impressions',
        'Clicks',
        'Spend',
        '7 Day Total Sales ',
        '7 Day Total Orders (#)',
      ].join('\t'),
      ['DE_Auto', 'Auto', 'dog coat', 'broad', 'waste term', '5000', '15', '€18,00', '0', '0'].join('\t'),
      ['DE_Auto', 'Auto', 'dog coat', 'broad', 'scale term', '4100', '45', '$54.20', '$250.00', '6'].join('\t'),
      ['DE_Exact', 'Core', 'dog coat', 'exact', 'harvest term', '1800', '24', '70.00', '220.00', '4'].join('\t'),
      ['DE_Exact', 'Core', 'dog coat', 'exact', 'bid down term', '1800', '20', '120.00', '180.00', '2'].join('\t'),
      ['DE_Broad', 'Explore', 'dog coat', 'broad', 'listing term', '500', '3', '2.00', '0', '0'].join('\t'),
    ].join('\n');

    const result = analyzeSearchTermReport(report, thresholds);
    const byTerm = Object.fromEntries(result.rows.map((row) => [row.searchTerm, row]));

    expect(result.totalRows).toBe(5);
    expect(result.validRows).toBe(5);
    expect(byTerm['waste term']?.action).toBe('negative_exact');
    expect(byTerm['scale term']?.action).toBe('scale_budget');
    expect(byTerm['harvest term']?.action).toBe('harvest_exact');
    expect(byTerm['bid down term']?.action).toBe('bid_down');
    expect(byTerm['listing term']?.action).toBe('listing_term');
  });

  it('正确解析欧美数字格式', () => {
    const report = [
      'Campaign,Ad Group,Search Term,Clicks,Spend,Sales,Orders',
      'DE_Auto,Auto,euro format,1.234,"1.234,56","4.000,00",2',
      'US_Auto,Auto,us format,"1,234","1,234.56","4,000.00",2',
    ].join('\n');

    const result = analyzeSearchTermReport(report, thresholds);
    const byTerm = Object.fromEntries(result.rows.map((row) => [row.searchTerm, row]));

    expect(byTerm['euro format']?.clicks).toBe(1234);
    expect(byTerm['euro format']?.spend).toBeCloseTo(1234.56);
    expect(byTerm['euro format']?.sales).toBeCloseTo(4000);
    expect(byTerm['us format']?.clicks).toBe(1234);
    expect(byTerm['us format']?.spend).toBeCloseTo(1234.56);
    expect(byTerm['us format']?.sales).toBeCloseTo(4000);
  });

  it('兼容带括号说明的 Amazon Ads 表头', () => {
    const report = [
      [
        'Campaign Name',
        'Ad Group Name',
        'Customer Search Term (Informational only)',
        'Clicks (Informational only)',
        'Spend (Informational only)',
        'Sales (7 Day Total)',
        'Orders (7 Day Total)',
      ].join(','),
      ['DE_Auto', 'Auto', 'bracket term', '20', '10', '80', '2'].join(','),
    ].join('\n');

    const result = analyzeSearchTermReport(report, thresholds);

    expect(result.rows[0]?.searchTerm).toBe('bracket term');
    expect(result.rows[0]?.action).toBe('scale_budget');
  });

  it('保留 CSV 引号内的分隔符', () => {
    const parsed = parseReport('Search Term,Clicks,Spend,Sales,Orders\n"dog, coat",2,3,4,1');

    expect(parsed.records[0]?.['Search Term']).toBe('dog, coat');
  });

  it('缺少必要列时给出明确错误', () => {
    expect(() => analyzeSearchTermReport('Search Term,Clicks,Spend,Sales\ndog coat,2,3,4', thresholds)).toThrow('订单');
  });

  it('导出 CSV 时转义逗号和引号', () => {
    const result = analyzeSearchTermReport('Search Term,Clicks,Spend,Sales,Orders\n"dog, ""winter"" coat",12,20,0,0', thresholds);
    const csv = buildActionCsv(result.rows);

    expect(csv).toContain('"dog, ""winter"" coat"');
  });

  it('生成周报摘要动作计数', () => {
    const result = analyzeSearchTermReport('Search Term,Clicks,Spend,Sales,Orders\nwaste term,12,20,0,0\nscale term,20,20,100,2', thresholds);
    const summary = buildSummaryText(result.rows);

    expect(summary).toContain('否精准：1');
    expect(summary).toContain('加预算：1');
  });
});
