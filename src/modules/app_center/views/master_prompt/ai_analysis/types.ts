/**
 * AI智能分析 - 类型定义
 */

export interface AnalysisTarget {
  id: string;
  name: string;
  description: string;
  source: 'Listings' | 'Reviews';
  icon: string;
  color: string;
}

export interface AnalysisResult {
  targetId: string;
  title: string;
  source: 'Listings' | 'Reviews';
  icon: string;
  color: string;
  stats: { label: string; value: string }[];
  highlights: { text: string; type: 'danger' | 'success' | 'warning' | 'info' }[];
  details: { category: string; items: string[] }[];
}
