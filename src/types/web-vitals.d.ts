// src/types/web-vitals.d.ts
// web-vitals库的类型声明(可选依赖)

declare module 'web-vitals' {
  export type MetricName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB' | 'INP';

  export interface Metric {
    name: MetricName;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    delta: number;
    id: string;
    navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
  }

  export type ReportCallback = (metric: Metric) => void;

  export function onCLS(callback: ReportCallback): void;
  export function onFID(callback: ReportCallback): void;
  export function onLCP(callback: ReportCallback): void;
  export function onFCP(callback: ReportCallback): void;
  export function onTTFB(callback: ReportCallback): void;
  export function onINP(callback: ReportCallback): void;
}
