import { beforeEach, expect, it } from 'vitest';
import { createPromptlabPanel } from '@/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel';
import { promptlabService } from '@/modules/app_center/views/master_analysis/services/promptlabService';
import { appStore } from '@/stores/useAppStore';
import type { PromptInputs } from '@/types/state';

const buyerProfileReport = {
  metadata: {},
  analysisReport: {
    'buyer-profile': {
      demographics: {
        likely_gender: 'mixed',
        age_range_estimate: '25-34',
        lifestyle_indicators: ['sportlich aktiv', 'familienorientiert'],
      },
      buyer_types: [],
      usage_scenes: [],
      purchase_motivations: [],
      geographic_insights: {
        primary_markets: [],
        cultural_considerations: [],
      },
    },
  },
};

const fatalFlawsReport = {
  metadata: {},
  analysisReport: {
    'fatal-flaws': {
      risk_assessment: {
        overall_risk_level: 'high',
        primary_concern: 'leaks under pressure',
      },
      critical_issues: [
        {
          issue: 'Leaks after first use',
          severity: 'high',
          user_quotes: ['it leaked immediately'],
        },
      ],
      return_triggers: ['leaks', 'weak seal'],
    },
  },
};

const makeInputs = (items: Record<string, boolean>): PromptInputs => ({
  targetMarket: 'German',
  keywordsTier1: 'sportsocken',
  keywordsTier2: 'rutschfest',
  audience: '',
  usps: '',
  specs: '',
  socialHook: '',
  negative: '',
  tone: 'professional',
  customStrategy: '',
  useCosmo: false,
  useRufus: false,
  useEmoji: false,
  selectedReportSections: [],
  selectedReportItems: {
    'buyer-profile': {
      enabled: true,
      subItems: {
        demographics: {
          enabled: true,
          items,
        },
        buyer_types: false,
        usage_scenes: false,
        purchase_motivations: false,
        geographic_insights: false,
      },
    },
  },
  charLimit: 5000,
  useAnalysisData: true,
});

const makeFatalInputs = (): PromptInputs => ({
  targetMarket: 'German',
  keywordsTier1: 'sports bottle',
  keywordsTier2: 'leakproof',
  audience: '',
  usps: '',
  specs: '',
  socialHook: '',
  negative: '',
  tone: 'professional',
  customStrategy: '',
  useCosmo: false,
  useRufus: false,
  useEmoji: false,
  selectedReportSections: [],
  selectedReportItems: {
    'fatal-flaws': {
      enabled: true,
      subItems: {
        risk_assessment: false,
        critical_issues: false,
        return_triggers: false,
      },
    },
  },
  charLimit: 5000,
  useAnalysisData: true,
});

  beforeEach(() => {
    appStore.getState().updateAnalysis({ analysisReport: buyerProfileReport as any });
    appStore.getState().setUserProductProfile({
      targetMarket: '',
      keywordsTier1: '',
      keywordsTier2: '',
      audience: '',
      usps: '',
      specs: '',
      socialHook: '',
      negative: '',
      tone: 'professional',
      customStrategy: '',
      useCosmo: false,
      useRufus: false,
      useEmoji: false,
      selectedReportSections: [],
      charLimit: 5000,
    });
  });

  it('cascades object sub-item toggles to concrete demographic fields', () => {
    const component = createPromptlabPanel();
    component.initializeGranularSelections('buyer-profile');

    expect(component.getContentItemIndexes('buyer-profile', 'demographics')).toEqual([
      'likely_gender',
      'age_range_estimate',
      'lifestyle_indicators',
    ]);

    component.onSubItemToggle('buyer-profile', 'demographics');

    expect(component.isSubItemSelected('buyer-profile', 'demographics')).toBe(false);
    expect(component.isContentItemSelected('buyer-profile', 'demographics', 'likely_gender')).toBe(false);
    expect(component.isContentItemSelected('buyer-profile', 'demographics', 'age_range_estimate')).toBe(false);
    expect(component.isContentItemSelected('buyer-profile', 'demographics', 'lifestyle_indicators')).toBe(false);
  });

  it('keeps unchecked demographic fields out of generated prompts by stable field key', () => {
    const masterPrompt = promptlabService.generateMasterPrompt(
      makeInputs({ likely_gender: false, age_range_estimate: false }),
      buyerProfileReport as any,
    );
    const visualPrompt = promptlabService.generateVisualPrompt(
      makeInputs({ likely_gender: false, age_range_estimate: false }),
      buyerProfileReport as any,
    );

    expect(masterPrompt).not.toContain('Gender: mixed');
    expect(masterPrompt).not.toContain('Age: 25-34');
    expect(masterPrompt).toContain('Lifestyle: sportlich aktiv, familienorientiert');
    expect(visualPrompt).not.toContain('Gender: mixed');
    expect(visualPrompt).not.toContain('Age: 25-34');
    expect(visualPrompt).toContain('Lifestyle: sportlich aktiv, familienorientiert');
  });

  it('keeps legacy numeric object selections working for saved profiles', () => {
    const masterPrompt = promptlabService.generateMasterPrompt(
      makeInputs({ '0': false, '1': false }),
      buyerProfileReport as any,
    );
    const visualPrompt = promptlabService.generateVisualPrompt(
      makeInputs({ '0': false, '1': false }),
      buyerProfileReport as any,
    );

    expect(masterPrompt).not.toContain('Gender: mixed');
    expect(masterPrompt).not.toContain('Age: 25-34');
    expect(masterPrompt).toContain('Lifestyle: sportlich aktiv, familienorientiert');
    expect(visualPrompt).not.toContain('Gender: mixed');
    expect(visualPrompt).not.toContain('Age: 25-34');
    expect(visualPrompt).toContain('Lifestyle: sportlich aktiv, familienorientiert');
  });

  it('syncs dimension state when all sub-items are selected or deselected', () => {
    appStore.getState().updateAnalysis({ analysisReport: fatalFlawsReport as any });
    const component = createPromptlabPanel();
    component.initializeGranularSelections('fatal-flaws');

    component.deselectAllSubItems('fatal-flaws');

    expect(component.isDimensionEnabled('fatal-flaws')).toBe(false);
    expect(component.profile.selectedReportItems?.['fatal-flaws'].enabled).toBe(false);

    component.selectAllSubItems('fatal-flaws');

    expect(component.isDimensionEnabled('fatal-flaws')).toBe(true);
    expect(component.profile.selectedReportItems?.['fatal-flaws'].enabled).toBe(true);
  });

  it('re-enables a disabled dimension when sub-items or content are selected directly', () => {
    appStore.getState().updateAnalysis({ analysisReport: fatalFlawsReport as any });
    const component = createPromptlabPanel();
    component.initializeGranularSelections('fatal-flaws');

    component.onDimensionToggle('fatal-flaws');
    component.onSubItemToggle('fatal-flaws', 'critical_issues');

    expect(component.isDimensionEnabled('fatal-flaws')).toBe(true);
    expect(component.isSubItemSelected('fatal-flaws', 'critical_issues')).toBe(true);

    component.onDimensionToggle('fatal-flaws');
    component.onContentItemToggle('fatal-flaws', 'critical_issues', '0');

    expect(component.isDimensionEnabled('fatal-flaws')).toBe(true);
    expect(component.isContentItemSelected('fatal-flaws', 'critical_issues', '0')).toBe(true);
  });

  it('does not inject a report dimension title when every sub-item is unchecked', () => {
    const masterPrompt = promptlabService.generateMasterPrompt(
      makeFatalInputs(),
      fatalFlawsReport as any,
    );
    const visualPrompt = promptlabService.generateVisualPrompt(
      makeFatalInputs(),
      fatalFlawsReport as any,
    );

    expect(masterPrompt).not.toContain('Fatal Flaws');
    expect(visualPrompt).not.toContain('Fatal Flaws');
  });
