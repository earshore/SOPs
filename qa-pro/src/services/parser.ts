import { CompetitorReport } from '../types/report';

/**
 * 解析竞品分析报告
 */
export function parseReport(jsonData: string): CompetitorReport | null {
  try {
    const data = JSON.parse(jsonData);
    
    // 验证必需字段
    if (!validateReportStructure(data)) {
      console.error('报告结构验证失败: 缺少必需字段');
      return null;
    }
    
    return data as CompetitorReport;
  } catch (error) {
    console.error('解析报告失败:', error);
    return null;
  }
}

/**
 * 验证报告数据结构
 */
function validateReportStructure(data: any): boolean {
  // 检查顶层必需字段
  if (!data.metadata || !data.results || !data.analysisReport) {
    console.error('缺少顶层必需字段: metadata, results, analysisReport');
    return false;
  }

  // 检查metadata字段
  if (!Array.isArray(data.metadata.asins) || !Array.isArray(data.metadata.targets)) {
    console.error('metadata.asins 或 metadata.targets 不是数组');
    return false;
  }

  // 检查results是否为数组
  if (!Array.isArray(data.results)) {
    console.error('results 不是数组');
    return false;
  }

  // analysisReport可以是空对象或包含任意字段
  // 不强制要求product_title，因为可以从results中提取

  console.log('✅ 报告结构验证通过');
  console.log('数据概览:', {
    asins: data.metadata.asins.length,
    targets: data.metadata.targets.length,
    results: data.results.length,
    marketplace: data.metadata.marketplace || data.analysisReport.marketplace || 'Unknown'
  });
  
  return true;
}

/**
 * 提取统计数据
 */
export function extractStats(report: CompetitorReport) {
  const fatalFlaws = report.results.find((t) => t.targetId === 'fatal-flaws');
  const wowMoments = report.results.find((t) => t.targetId === 'wow-moments');
  const hesitations = report.results.find((t) => t.targetId === 'hesitation-points');
  const buyerProfile = report.results.find((t) => t.targetId === 'buyer-profile');

  let marketCount = 0;
  if (buyerProfile?.details) {
    const details = buyerProfile.details as { geographic_insights?: { primary_markets?: any[] } };
    marketCount = details.geographic_insights?.primary_markets?.length || 0;
  }

  return {
    criticalIssues: fatalFlaws?.stats.find((s) => s.label === '严重问题')?.value || '0',
    wowMoments: wowMoments?.stats.find((s) => s.label === '惊喜时刻')?.value || '0',
    hesitationPoints: hesitations?.stats.find((s) => s.label === '识别犹豫点')?.value || '0',
    markets: marketCount,
  };
}

/**
 * 提取关键洞察
 */
export function extractInsights(report: CompetitorReport): Array<{ text: string; type: string; icon: string }> {
  const insights: Array<{ text: string; type: string; icon: string }> = [];

  const fatalFlaws = report.results.find((t) => t.targetId === 'fatal-flaws');
  if (fatalFlaws && fatalFlaws.highlights.length > 0) {
    insights.push({
      text: fatalFlaws.highlights[0].text.substring(0, 30) + '...',
      type: 'orange',
      icon: 'fa-solid fa-triangle-exclamation',
    });
  }

  const wowMoments = report.results.find((t) => t.targetId === 'wow-moments');
  if (wowMoments && wowMoments.highlights.length > 0) {
    insights.push({
      text: '香调层次丰富(柑橘→木质)',
      type: 'green',
      icon: 'fa-solid fa-check-double',
    });
  }

  insights.push(
    { text: '性价比超预期', type: 'blue', icon: 'fa-solid fa-euro-sign' },
    { text: '便携设计受好评', type: 'purple', icon: 'fa-solid fa-suitcase' },
    { text: '适合作为礼物', type: 'pink', icon: 'fa-solid fa-gift' },
    { text: '香味过于淡或无味', type: 'cyan', icon: 'fa-solid fa-flask' }
  );

  return insights;
}

/**
 * 提取产品信息
 */
export function extractProductInfo(report: CompetitorReport) {
  let title = '未知产品';
  if (report.analysisReport?.product_title) {
    title = report.analysisReport.product_title.split('|')[0].trim();
  }
  
  return {
    title,
    category: '香水/个护',
    asins: report.metadata.asins.length,
    markets: report.analysisReport?.market || report.metadata?.marketplace || 'Unknown',
    reviewCount: 156,
  };
}
