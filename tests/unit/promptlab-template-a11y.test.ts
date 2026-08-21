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

  it('keeps the listing version control visually integrated and theme-aware', () => {
    expect(template).toContain('promptlab-generate-button');
    expect(template).toContain('promptlab-version-label');
    expect(template).toContain('promptlab-version-menu');
    expect(template).toContain('promptlab-version-option');
    expect(template).toContain('aria-label="选择 Listing Prompt 版本"');
    expect(template).toContain('aria-controls="listing-version-menu"');
    expect(template).toContain('role="button"');
    expect(template).toContain('tabindex="0"');
    expect(template).toContain('aria-expanded="false"');
    expect(template).not.toContain('listingVersionCaretClass');
    expect(template).not.toContain('listingVersionMenuOpen.toString()');
    expect(template).not.toContain('promptlab-version-toggle');
    expect(template).not.toMatch(/<button\b[^>]*aria-label="选择 Listing Prompt 版本"/s);
    expect(template).not.toContain('2026 新规版');
    expect(template).toContain('新规版');
  });

  it('defines light and dark surfaces for the listing version menu', () => {
    const css = readFileSync(
      'src/modules/app_center/views/master_analysis/master_analysis_style.css',
      'utf8'
    );

    expect(css).toContain('.promptlab-version-menu');
    expect(css).toContain('[data-color-mode-resolved=\'dark\'] .promptlab-version-menu');
    expect(css).toContain('.promptlab-version-label');
    expect(css).not.toContain('.promptlab-version-toggle');
    expect(css).toContain('background: var(--ma-accent, #6257f5)');
    expect(css).toContain('white-space: nowrap');
  });

  it('keeps the teleported version menu inside the PromptLab Alpine scope', () => {
    expect(template).toContain('<template x-teleport="body">');
    expect(template).toContain('x-show="listingVersionMenuOpen"');
    expect(template).toMatch(
      /<template x-teleport="body">[\s\S]*id="listing-version-menu"[\s\S]*<\/template>/
    );
  });

  it('keeps Listing and Visual generation buttons on the same full-width track', () => {
    const listingButton = template.match(
      /<button\b[^>]*id="btn-generate-prompt"[^>]*>/s
    )?.[0];
    const visualButton = template.match(
      /<button\b[^>]*id="btn-generate-visual"[^>]*>/s
    )?.[0];

    expect(listingButton).toContain('w-full');
    expect(visualButton).toContain('w-full');
  });
});
