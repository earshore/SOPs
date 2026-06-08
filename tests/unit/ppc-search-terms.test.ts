import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  analyzeReport,
  analyzeSearchTermReport,
  buildActionCsv,
  buildSummaryText,
  parseReport,
  type Thresholds,
  xlsxArrayBufferToDelimitedText,
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

  it('兼容 xlsx 工作表并复用现有字段识别', async () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Campaign Name', 'Ad Group Name', 'Customer Search Term', 'Clicks', 'Spend', 'Sales', 'Orders'],
      ['DE_Auto', 'Auto', 'xlsx waste term', 12, 20, 0, 0],
      ['DE_Exact', 'Core', 'xlsx scale term', 20, 20, 100, 2],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Search Term');

    const reportText = await xlsxArrayBufferToDelimitedText(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
    const result = analyzeSearchTermReport(reportText, thresholds);
    const byTerm = Object.fromEntries(result.rows.map((row) => [row.searchTerm, row]));

    expect(result.validRows).toBe(2);
    expect(byTerm['xlsx waste term']?.action).toBe('negative_exact');
    expect(byTerm['xlsx scale term']?.action).toBe('scale_budget');
  });

  it('兼容商品推广搜索词报告的中文 xlsx 表头', async () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      [
        '开始日期',
        '结束日期',
        '广告组合名称',
        '货币',
        '广告活动名称',
        '广告组名称',
        '投放',
        '匹配类型',
        '客户搜索词',
        '展示量',
        '点击量',
        '点击率(CTR)',
        '每次点击成本(CPC)',
        '花费',
        '7天总销售额',
        '广告成本销售比(ACOS)',
        '投入产出比(ROAS)',
        '7天总订单数(#)',
        '7天总销售量(#)',
        '7天的转化率',
        '7天内广告SKU销售量(#)',
        '7天内其他SKU销售量(#)',
        '7天内广告SKU销售额',
        '7天内其他SKU销售额',
      ],
      [
        'Feb 16, 2023',
        'Feb 16, 2023',
        'Not grouped',
        'EUR',
        'H-Manual',
        'Ad group 1',
        'luftballon hund',
        'PHRASE',
        'luftballon hund',
        1200,
        12,
        '1.0000%',
        '€1.30',
        '€15.60',
        '€0.00',
        '',
        '0.00',
        0,
        0,
        '0.0000%',
        0,
        0,
        '€0.00',
        '€0.00',
      ],
      [
        'Feb 03, 2023',
        'Feb 05, 2023',
        'Not grouped',
        'EUR',
        'H-Manual',
        'B09TZR4696',
        'einhorn haarreif für kinder',
        'EXACT',
        'einhorn haarreif kinder',
        286,
        10,
        '3.4965%',
        '€0.38',
        '€3.80',
        '€26.70',
        '14.2322%',
        '7.03',
        3,
        3,
        '30.0000%',
        3,
        0,
        '€26.70',
        '€0.00',
      ],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sponsored Product Search Term R');

    const reportText = await xlsxArrayBufferToDelimitedText(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
    const result = analyzeReport(reportText, thresholds, 'auto');
    const byTerm = Object.fromEntries(result.rows.map((row) => [row.searchTerm, row]));

    expect(result.reportType).toBe('search_term');
    expect(result.validRows).toBe(2);
    expect(byTerm['luftballon hund']?.campaign).toBe('H-Manual');
    expect(byTerm['luftballon hund']?.keyword).toBe('luftballon hund');
    expect(byTerm['luftballon hund']?.action).toBe('negative_exact');
    expect(byTerm['einhorn haarreif kinder']?.action).toBe('scale_budget');
  });

  it('自动识别 ERP 广告活动报表并生成活动级动作', () => {
    const report = [
      [
        '店铺名称',
        '广告活动',
        '服务状态',
        '每日预算',
        '投放类型',
        '广告类型',
        '广告活动竞价策略',
        '广告曝光量',
        '广告点击量',
        '广告花费',
        '广告订单量',
        '广告销售额',
        'ACoS',
        'ROAS',
        '本广告产品销售额',
        '其他产品广告销售额',
        '广告点击率',
        '广告转化率',
      ].join(','),
      ['DE Store', '付款异常活动', '广告账号付款失败', '20', '自动', 'SP', '动态竞价', '0', '0', '0', '0', '0', '0%', '0', '0', '0', '0%', '0%'].join(','),
      ['DE Store', '无单浪费活动', '正在投放', '30', '自动', 'SP', '动态竞价', '3000', '15', '20', '0', '0', '0%', '0', '0', '0', '0.5%', '0%'].join(','),
      ['DE Store', '高 ACOS 活动', '正在投放', '30', '手动', 'SP', '固定竞价', '2000', '20', '70', '2', '100', '70%', '1.43', '80', '20', '1%', '10%'].join(','),
      ['DE Store', '可加预算活动', '正在投放', '30', '手动', 'SP', '动态竞价', '3000', '30', '20', '3', '120', '16.7%', '6', '110', '10', '1%', '10%'].join(','),
      ['DE Store', '结构复盘活动', '正在投放', '30', '手动', 'SP', '动态竞价', '5000', '25', '20', '1', '100', '20%', '5', '10', '80', '0.5%', '4%'].join(','),
    ].join('\n');

    const result = analyzeReport(report, thresholds, 'auto');
    const byCampaign = Object.fromEntries(result.rows.map((row) => [row.searchTerm, row]));

    expect(result.reportType).toBe('erp_campaign');
    expect(result.validRows).toBe(5);
    expect(byCampaign['付款异常活动']?.action).toBe('campaign_fix_status');
    expect(byCampaign['无单浪费活动']?.action).toBe('campaign_pause');
    expect(byCampaign['高 ACOS 活动']?.action).toBe('campaign_bid_down');
    expect(byCampaign['可加预算活动']?.action).toBe('campaign_scale');
    expect(byCampaign['结构复盘活动']?.action).toBe('campaign_structure');
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
