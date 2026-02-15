// 类型定义
export type ToastType = 'success' | 'error' | 'info';

export interface SampleData {
  product: string;
  category: string;
  competitors: number;
  asins: string[];
  dimensions: string[];
  markets: string[];
  analysis: {
    total_reviews: number;
    critical_issues: number;
    wow_moments: number;
    hesitation_points: number;
  };
}

export interface DOMElements {
  btnAnalyze: HTMLButtonElement | null;
  btnSample: HTMLButtonElement | null;
  btnClear: HTMLButtonElement | null;
  jsonInput: HTMLTextAreaElement | null;
  progressSection: HTMLElement | null;
  inputSection: HTMLElement | null;
  resultsSection: HTMLElement | null;
  progressBar: HTMLElement | null;
  expandAllBtn: HTMLButtonElement | null;
  logoIcon: HTMLElement | null;
  toastContainer: HTMLElement | null;
}

export interface AppState {
  allExpanded: boolean;
  clickCount: number;
}
