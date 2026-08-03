import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const template = readFileSync(
  'src/modules/app_center/views/master_analysis/promptlab/template.html',
  'utf8'
);
const reportRenderer = readFileSync(
  'src/modules/app_center/views/master_analysis/promptlab/components/reportRenderer.ts',
  'utf8'
);

describe('PromptLab template accessibility semantics', () => {
  it('keeps PromptLab buttons explicit about non-submit behavior', () => {
    const buttonOpenings = template.match(/<button\b[^>]*>/g) ?? [];
    const implicitButtons = buttonOpenings.filter(
      button => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
    );

    // Contract is "no implicit type" — count only guards against silent removal.
    expect(buttonOpenings.length).toBeGreaterThan(0);
    expect(implicitButtons).toEqual([]);
  });

  it('keeps PromptLab report renderer buttons explicit about non-submit behavior', () => {
    const buttonOpenings = reportRenderer.match(/<button\b[^>]*>/g) ?? [];
    const implicitButtons = buttonOpenings.filter(
      button => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
    );

    expect(buttonOpenings).toHaveLength(4);
    expect(implicitButtons).toEqual([]);
  });

  it('keeps Tier 1, restricted terms, and target audience as expandable single-line textareas', () => {
    const fields = [
      {
        id: 'lab-keywords-tier1',
        input: "setProfileField('keywordsTier1', $event)",
        label: 'lab-keywords-tier1-label',
        description: 'lab-keywords-tier1-source',
      },
      {
        id: 'negative-keywords',
        input: "setProfileField('negative', $event)",
        label: 'negative-keywords-label',
        description: 'negative-keywords-source',
      },
      {
        id: 'lab-audience',
        input: "setProfileField('audience', $event)",
        label: 'lab-audience-label',
        description: 'lab-audience-source',
      },
    ];

    fields.forEach(field => {
      const textarea = template.match(
        new RegExp(`<textarea\\b[^>]*\\bid="${field.id}"[^>]*>`, 's')
      )?.[0];

      expect(textarea).toBeTruthy();
      expect(textarea).toContain(`@input="${field.input}"`);
      expect(textarea).toContain('@focus="expandInput($event)"');
      expect(textarea).toContain('@blur="restoreInput($event)"');
      expect(textarea).toContain('rows="1"');
      expect(textarea).toContain(`aria-labelledby="${field.label}"`);
      expect(textarea).toContain(`aria-describedby="${field.description}"`);
      expect(template).not.toMatch(new RegExp(`<input\\b[^>]*\\bid="${field.id}"`, 's'));
    });
  });
});
