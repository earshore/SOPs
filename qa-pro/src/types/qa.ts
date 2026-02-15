/**
 * Q&A 数据结构
 */
export interface QAItem {
  rank: number;
  question: string;
  category: string;
  categoryClass: string;
  tag: string;
  tagClass: string;
  answer: string;
  priority: number;
  source: string;
}

/**
 * Q&A 分析结果
 */
export interface QAAnalysisResult {
  qaList: QAItem[];
  stats: {
    totalQA: number;
    byCategory: Record<string, number>;
    highPriority: number;
  };
}
