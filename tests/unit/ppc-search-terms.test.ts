import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  analyzeReport,
  analyzeSearchTermReport,
  buildActionCsv,
  buildSummaryText,
  parseReport,
  type Thresholds,
  xlsxArrayBufferToDelimitedText,
} from '@/modules/app_center/views/ppc_search_terms/index';
import { selectPpcAgentModelRows } from '@/modules/app_center/views/ppc_search_terms/services/llmAnalysisService';

const thresholds: Thresholds = {
  targetAcos: 35,
  highAcos: 55,
  minClicksNoOrder: 12,
  minSpendNoOrder: 15,
  minOrdersHarvest: 2,
  minCtr: 0.35,
};

type XlsxCell = string | number | boolean | null;

function createXlsxBuffer(rows: XlsxCell[][], sheetName: string): ArrayBuffer {
  const worksheetXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<sheetData>',
    ...rows.map((row, rowIndex) => renderXlsxRow(row, rowIndex + 1)),
    '</sheetData>',
    '</worksheet>',
  ].join('');

  const zip = zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '</Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>',
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
      + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheets>'
      + `<sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>`
      + '</sheets>'
      + '</workbook>',
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      + '</Relationships>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(worksheetXml),
  });

  return zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer;
}

function renderXlsxRow(row: XlsxCell[], rowNumber: number): string {
  const cells = row
    .map((cell, index) => renderXlsxCell(cell, `${columnName(index)}${rowNumber}`))
    .join('');
  return `<row r="${rowNumber}">${cells}</row>`;
}

function renderXlsxCell(cell: XlsxCell, ref: string): string {
  if (cell === null) {
    return '';
  }
  if (typeof cell === 'number') {
    return `<c r="${ref}"><v>${cell}</v></c>`;
  }
  if (typeof cell === 'boolean') {
    return `<c r="${ref}" t="b"><v>${cell ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
}

function columnName(index: number): string {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

  it('PPC Agent 只挑选低置信高影响搜索词进入模型复核', () => {
    const report = [
      'Campaign,Ad Group,Search Term,Keyword,Match Type,Impressions,Clicks,Spend,Sales,Orders',
      'DE_Auto,Auto,waste term,dog coat,broad,5000,15,18,0,0',
      'DE_Auto,Auto,scale term,dog coat,broad,4100,45,54,250,6',
      'DE_Auto,Auto,semantic listing term,dog coat,broad,100,5,2,0,0',
      'DE_Auto,Auto,low ctr term,dog coat,broad,2000,1,1,0,0',
      'DE_Auto,Auto,tiny sample,dog coat,broad,100,1,1,0,0',
    ].join('\n');

    const result = analyzeSearchTermReport(report, thresholds);
    const modelRows = selectPpcAgentModelRows(result.rows, thresholds);
    const modelTerms = modelRows.map((row) => row.searchTerm);

    expect(modelTerms).toContain('semantic listing term');
    expect(modelTerms).toContain('low ctr term');
    expect(modelTerms).not.toContain('waste term');
    expect(modelTerms).not.toContain('scale term');
    expect(modelTerms).not.toContain('tiny sample');
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
    const workbook = createXlsxBuffer([
      ['Campaign Name', 'Ad Group Name', 'Customer Search Term', 'Clicks', 'Spend', 'Sales', 'Orders'],
      ['DE_Auto', 'Auto', 'xlsx waste term', 12, 20, 0, 0],
      ['DE_Exact', 'Core', 'xlsx scale term', 20, 20, 100, 2],
    ], 'Search Term');

    const reportText = await xlsxArrayBufferToDelimitedText(workbook);
    const result = analyzeSearchTermReport(reportText, thresholds);
    const byTerm = Object.fromEntries(result.rows.map((row) => [row.searchTerm, row]));

    expect(result.validRows).toBe(2);
    expect(byTerm['xlsx waste term']?.action).toBe('negative_exact');
    expect(byTerm['xlsx scale term']?.action).toBe('scale_budget');
  });

  it('兼容商品推广搜索词报告的中文 xlsx 表头', async () => {
    const workbook = createXlsxBuffer([
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
    ], 'Sponsored Product Search Term R');

    const reportText = await xlsxArrayBufferToDelimitedText(workbook);
    const result = analyzeReport(reportText, thresholds, 'auto');
    const byTerm = Object.fromEntries(result.rows.map((row) => [row.searchTerm, row]));

    expect(result.reportType).toBe('search_term');
    expect(result.validRows).toBe(2);
    expect(byTerm['luftballon hund']?.campaign).toBe('H-Manual');
    expect(byTerm['luftballon hund']?.keyword).toBe('luftballon hund');
    expect(byTerm['luftballon hund']?.action).toBe('negative_exact');
    expect(byTerm['einhorn haarreif kinder']?.action).toBe('scale_budget');
  });

  it('自动识别 ERP 广告搜索词报表并保留店铺维度', async () => {
    const workbook = createXlsxBuffer([
      [
        '店铺名称',
        '用户搜索词',
        '用户搜索词翻译',
        '投放',
        '匹配类型',
        '所在广告组',
        '所在广告活动',
        '广告花费',
        '广告曝光量',
        '广告点击量',
        '广告订单量',
        '广告销售额',
        'ACoS',
      ],
      [
        '3-WAZZM-DE',
        'styropor flugzeuge für kinder',
        '儿童聚苯乙烯泡沫塑料飞机',
        'styropor flugzeuge für kinder',
        '广泛匹配',
        'B0C3GH8QKH',
        'H- B0C3GH8QKH -滑翔机-手动',
        20,
        2780,
        12,
        0,
        0,
        0,
      ],
      [
        '16-phxdance-DE',
        'einhorn haarreif kinder',
        '儿童独角兽发箍',
        'einhorn haarreif für kinder',
        '精确匹配',
        'B09TZR4696',
        'B09TZR4696 -独角兽-手动',
        20,
        1200,
        20,
        3,
        120,
        0.1667,
      ],
    ], 'sheet');

    const reportText = await xlsxArrayBufferToDelimitedText(workbook);
    const result = analyzeReport(reportText, thresholds, 'auto');
    const byTerm = Object.fromEntries(result.rows.map((row) => [row.searchTerm, row]));
    const csv = buildActionCsv(result.rows);

    expect(result.reportType).toBe('erp_search_term');
    expect(result.validRows).toBe(2);
    expect(byTerm['styropor flugzeuge für kinder']?.store).toBe('3-WAZZM-DE');
    expect(byTerm['styropor flugzeuge für kinder']?.campaign).toBe('H- B0C3GH8QKH -滑翔机-手动');
    expect(byTerm['styropor flugzeuge für kinder']?.action).toBe('negative_exact');
    expect(byTerm['einhorn haarreif kinder']?.action).toBe('scale_budget');
    expect(csv).toContain('Store,Search Term');
    expect(csv).toContain('16-phxdance-DE');
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
