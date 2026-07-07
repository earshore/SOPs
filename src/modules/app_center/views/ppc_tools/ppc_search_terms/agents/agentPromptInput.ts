import { sanitizePromptInput } from '@/modules/app_center/views/master_analysis/ai_analysis/prompts/promptSanitizer';
import type { PpcSearchTermsAnalysisContext } from './agentTypes';
import type { AnalyzedRow } from '../types';

export function toPromptRow(row: AnalyzedRow): Record<string, string | number> {
  return {
    id: row.id,
    searchTerm: sanitizePromptInput(row.searchTerm),
    impressions: row.impressions,
    clicks: row.clicks,
    spend: round(row.spend),
    sales: round(row.sales),
    orders: row.orders,
    ctr: round(row.ctr),
    cvr: round(row.cvr),
    cpc: round(row.cpc),
    acos: round(row.acos),
    localAction: row.action,
    localPriority: row.priority,
    localReason: row.reason,
  };
}

export function compactContext(
  context?: PpcSearchTermsAnalysisContext
): Partial<PpcSearchTermsAnalysisContext> | null {
  if (!context || !hasContext(context)) return null;

  return {
    ...(context.asin.trim() && { asin: sanitizePromptInput(context.asin.trim()).slice(0, 120) }),
    ...(context.category.trim() && {
      category: sanitizePromptInput(context.category.trim()).slice(0, 200),
    }),
    ...(context.listing.trim() && {
      listing: sanitizePromptInput(context.listing.trim()).slice(0, 4000),
    }),
  };
}

function hasContext(context: PpcSearchTermsAnalysisContext): boolean {
  return Boolean(context.asin.trim() || context.category.trim() || context.listing.trim());
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
