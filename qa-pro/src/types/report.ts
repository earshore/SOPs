/**
 * 竞品分析报告完整类型定义 - 基于真实JSON结构
 */

export interface ReportMetadata {
  asins: string[];
  targets: string[];
  timestamp: string;
  dataSource: string;
  marketplace: string;
}

export interface Highlight {
  text: string;
  type: 'info' | 'success' | 'danger' | 'warning';
}

export interface Stats {
  label: string;
  value: string;
}

export interface DetailItem {
  category: string;
  items: string[];
}

export interface ResultTarget {
  targetId: string;
  title: string;
  source: string;
  icon: string;
  color: string;
  stats: Stats[];
  highlights: Highlight[];
  details: DetailItem[] | any; // details 可能是数组或对象
}

export interface HesitationItem {
  pre_purchase_worry: string;
  post_purchase_resolution: string;
  user_evidence: string;
  qa_recommendation: string;
}

export interface UsageScene {
  scene: string;
  frequency: string;
  context: string;
}

export interface CompetitorReport {
  metadata: ReportMetadata;
  results: ResultTarget[];
  analysisReport: {
    asin?: string;
    product_title?: string;
    analysis_timestamp?: string;
    market?: string;
    marketplace?: string;
    results?: ResultTarget[];
    targets?: string[];
    timestamp?: string;
    dataSource?: string;
    [key: string]: any;
  };
}
