import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface AnalysisTarget {
  id: string;
  name: string;
  description: string;
  source: 'Listings' | 'Reviews';
  icon: IconDefinition;
  color: string;
}

export interface AnalysisResult {
  targetId: string;
  title: string;
  source: 'Listings' | 'Reviews';
  icon: IconDefinition;
  color: string;
  stats: { label: string; value: string }[];
  highlights: { text: string; type: 'danger' | 'success' | 'warning' | 'info' }[];
  details: { category: string; items: string[] }[];
}
