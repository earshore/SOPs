import { beforeEach, expect, it, vi } from 'vitest';
import { appStore } from '@/stores/useAppStore';
import { showToast } from '@/common/ui';
import {
  autoPopulateDNA,
  canExtractDNA,
  extractSingleField,
  refreshDnaExtractionSummary,
} from './dnaActions';
import type { PromptlabAlpineContext } from './types';
import type { UserProductProfile } from '@/types/state';
import { confirmWithModal } from '../../utils/confirmModal';

type AnalysisReportStateValue = Parameters<
  ReturnType<typeof appStore.getState>['setAnalysisReport']
>[0];

vi.mock('@/common/ui', () => ({
  showToast: vi.fn(),
}));

vi.mock('../../utils/confirmModal', () => ({
  confirmWithModal: vi.fn().mockResolvedValue(true),
}));

const defaultProfile: UserProductProfile = {
  targetMarket: 'German',
  keywordsTier1: '',
  keywordsTier2: '',
  audience: '',
  usps: '',
  specs: '',
  socialHook: '',
  negative: '',
  tone: 'professional',
  customStrategy: '',
  useCosmo: true,
  useRufus: true,
  useEmoji: true,
  selectedReportSections: [],
  charLimit: 5000,
};

function createContext(profile: Partial<UserProductProfile> = {}): PromptlabAlpineContext {
  return {
    currentConsoleMode: 'listing',
    listingPromptCache: '',
    visualPromptCache: '',
    lastMarketplace: '',
    originalHeights: new Map(),
    profile: { ...defaultProfile, ...profile },
    dnaConfidence: {
      audience: 0,
      usps: 0,
      specs: 0,
      keywords: 0,
      keywordsTier1: 0,
      keywordsTier2: 0,
      negative: 0,
      overall: 0,
    },
    dnaExtractionSummary: null,
    hasRenderedReportOnce: false,
    expandedDimensions: new Set(),
    expandedSubItems: new Set(),
    _unsubscribers: [],
    _appStoreUnsubscribe: null,
    listingVersionMenuOpen: false,
    listingVersionMenuPosition: null,
    saveState: vi.fn(),
    renderReportAnalysis: vi.fn(),
    initializeGranularSelections: vi.fn(),
    handoffListingPromptToDeepChat: vi.fn(),
  };
}

function setAnalysisReport(report: unknown): void {
  appStore.getState().setAnalysisReport(report as AnalysisReportStateValue);
}

function semanticReport() {
  return {
    high_frequency_phrases: {
      attribute: ['desk bell'],
      use_cases: [],
    },
    native_voice: {
      native_phrasing: ['desk bell for service counter'],
      emotional_hook: [],
    },
    pain_point_gaps: {
      differentiation_angles: ['clearer tone'],
    },
    meta: {
      templateId: 'semantic',
    },
  };
}

function fullReportWithSizeSpec() {
  return {
    buyer_profile: {
      demographics: {
        likely_gender: 'female',
        age_range_estimate: '25-34',
        lifestyle_indicators: [],
      },
      buyer_types: [],
      purchase_motivations: [],
    },
    title_keywords: {
      primary_keywords: [],
      secondary_keywords: [{ keyword: '50ml', type: 'size', importance: 'spec' }],
      scene_keywords: [],
      audience_keywords: [],
      removed_modifiers: [],
      removed_brand_terms: [],
      optimization_suggestions: [],
    },
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  setAnalysisReport(null);
  vi.clearAllMocks();
  vi.mocked(confirmWithModal).mockResolvedValue(true);
});

it('uses field-level keyword confidence when auto-populating DNA', async () => {
  const ctx = createContext();
  setAnalysisReport(semanticReport());

  await autoPopulateDNA(ctx);

  expect(ctx.profile.keywordsTier1).toBe('desk bell');
  expect(ctx.profile.keywordsTier2).toBe('');
  expect(ctx.dnaConfidence.keywords).toBe(70);
  expect(ctx.dnaConfidence.keywordsTier1).toBe(75);
  expect(ctx.dnaConfidence.keywordsTier2).toBe(65);
  expect(ctx.saveState).toHaveBeenCalledOnce();
  expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Tier 2 长尾词'), {
    type: 'success',
  });
});

it('builds extraction summary without mutating profile fields', () => {
  const ctx = createContext();
  setAnalysisReport(semanticReport());

  refreshDnaExtractionSummary(ctx);

  expect(ctx.profile.keywordsTier1).toBe('');
  expect(ctx.profile.usps).toBe('');
  expect(ctx.dnaExtractionSummary).toMatchObject({
    extractableFields: 3,
    highConfidenceFields: 2,
    lowConfidenceFields: 1,
    reportType: 'semantic_analysis',
  });
  expect(ctx.dnaExtractionSummary?.fields).toContainEqual(
    expect.objectContaining({
      field: 'keywordsTier1',
      confidence: 75,
      source: '高频短语-属性词',
      status: 'high',
    })
  );
  expect(ctx.saveState).not.toHaveBeenCalled();
});

it('does not overwrite an existing single field with an empty extraction result', async () => {
  const ctx = createContext({ keywordsTier2: 'manual longtail' });
  setAnalysisReport({
    ...semanticReport(),
    native_voice: {
      native_phrasing: [],
      emotional_hook: [],
    },
  });

  await extractSingleField(ctx, 'keywordsTier2');

  expect(ctx.profile.keywordsTier2).toBe('manual longtail');
  expect(ctx.saveState).not.toHaveBeenCalled();
  expect(showToast).toHaveBeenCalledWith('报告中未找到Tier 2 长尾词，已保留现有内容', {
    type: 'warning',
  });
});

it('asks before overwriting with a low-confidence single-field extraction', async () => {
  vi.mocked(confirmWithModal).mockResolvedValue(false);
  const ctx = createContext({ keywordsTier2: 'manual longtail' });
  setAnalysisReport(semanticReport());

  await extractSingleField(ctx, 'keywordsTier2');

  expect(ctx.profile.keywordsTier2).toBe('manual longtail');
  expect(confirmWithModal).toHaveBeenCalledWith(
    '低置信度字段',
    '字段“Tier 2 长尾词”的提取置信度为 65%，低于自动填充阈值。是否仍然覆盖当前内容？',
    '',
    '仍然覆盖'
  );
  expect(ctx.saveState).not.toHaveBeenCalled();
});

it('normalizes PromptLab target market names before localized spec extraction', async () => {
  const ctx = createContext({ targetMarket: 'German' });
  setAnalysisReport(fullReportWithSizeSpec());

  await extractSingleField(ctx, 'specs');

  expect(ctx.profile.specs).toContain('Kapazität: 50ml');
  expect(ctx.profile.specsAuthority).toBe('report-derived');
});

it('checks extractability against the unwrapped report payload', () => {
  setAnalysisReport({
    metadata: { marketplace: 'DE' },
    analysisReport: semanticReport(),
  });

  expect(canExtractDNA()).toBe(true);
});
