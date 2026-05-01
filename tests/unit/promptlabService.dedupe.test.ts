import { describe, expect, it } from 'vitest';
import { promptlabService } from '@/modules/app_center/views/master_analysis/services/promptlabService';
import type { PromptInputs } from '@/types/state';

const REPORT_CASES = [
  {
    name: 'sports socks',
    primaryDifferentiation: 'Das Produkt positioniert sich als vielseitiges 5er-Pack rutschfester, elastischer und atmungsaktiver Sportsocken fuer Fussball, andere Sportarten und den Alltag.',
    targetPositioning: 'Preis- und nutzungsorientierte Mehrzweck-Sportsocken fuer Herren mit Groesse 38-46, die Komfort, Grip und Alltagstauglichkeit suchen.',
  },
  {
    name: 'car coating spray',
    primaryDifferentiation: 'Ein All-in-one-Keramikbeschichtungsspray, das Reinigung, Glanzauffrischung, Reparatur und Schutz in einem Produkt vereint.',
    targetPositioning: 'Fuer Autobesitzer, die eine einfache, schnelle und vielseitige Loesung zur optischen Aufwertung und zum Schutz des Lacks suchen.',
  },
];

const makeInputs = (overrides: Partial<PromptInputs> = {}): PromptInputs => ({
  targetMarket: 'German',
  keywordsTier1: 'Autobeschichtungsspray',
  keywordsTier2: 'wasserfest',
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
  selectedReportSections: ['selling-points'],
  charLimit: 5000,
  useAnalysisData: true,
  ...overrides,
});

const makeReport = (primaryDifferentiation: string, targetPositioning: string): any => {
  return {
    metadata: {},
    analysisReport: {
      'selling-points': {
        overall_strategy: {
          primary_differentiation: primaryDifferentiation,
          target_positioning: targetPositioning,
          emotional_hooks: [],
          missing_elements: [],
        },
        function_scene_matrix: {
          pain_points: [],
        },
        bullet_analysis: [],
      },
    },
  };
};

const countOccurrences = (text: string, phrase: string): number => {
  return text.split(phrase).length - 1;
};

const getSection = (prompt: string, start: string, end: string): string => {
  const startIndex = prompt.indexOf(start);
  if (startIndex < 0) return '';
  const endIndex = prompt.indexOf(end, startIndex + start.length);
  return prompt.slice(startIndex, endIndex < 0 ? undefined : endIndex);
};

describe('promptlabService product DNA de-duplication', () => {
  it.each(REPORT_CASES)('does not repeat report-loaded USP in Listing or Visual prompt: $name', (reportCase) => {
    const wrapper = makeReport(reportCase.primaryDifferentiation, reportCase.targetPositioning);
    const duplicateLine = reportCase.primaryDifferentiation;
    const inputs = makeInputs({ usps: duplicateLine });

    const listingPrompt = promptlabService.generateMasterPrompt(inputs, wrapper);
    const visualPrompt = promptlabService.generateVisualPrompt(inputs, wrapper);

    expect(countOccurrences(listingPrompt, duplicateLine)).toBe(1);
    expect(countOccurrences(visualPrompt, duplicateLine)).toBe(1);
    expect(getSection(listingPrompt, '## Product DNA Supplement', '## SEO Mandate')).not.toContain(duplicateLine);
    expect(getSection(visualPrompt, '## Product DNA Supplement', '## SEO Mandate')).not.toContain(duplicateLine);
  });

  it('keeps unique Product DNA lines while removing only duplicated report lines', () => {
    const reportCase = REPORT_CASES[1];
    const wrapper = makeReport(reportCase.primaryDifferentiation, reportCase.targetPositioning);
    const duplicateLine = reportCase.targetPositioning;
    const uniqueLine = '- Manual note: prioritize a streak-free finish claim';
    const inputs = makeInputs({
      usps: `${uniqueLine}\n- ${duplicateLine}`,
    });

    const prompt = promptlabService.generateMasterPrompt(inputs, wrapper);
    const productSection = getSection(prompt, '## Product DNA Supplement', '## SEO Mandate');

    expect(productSection).toContain(uniqueLine);
    expect(productSection).not.toContain(duplicateLine);
    expect(countOccurrences(prompt, duplicateLine)).toBe(1);
  });
});
