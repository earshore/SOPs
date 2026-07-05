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
      (button) => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
    );

    expect(buttonOpenings).toHaveLength(19);
    expect(implicitButtons).toEqual([]);
  });

  it('keeps PromptLab report renderer buttons explicit about non-submit behavior', () => {
    const buttonOpenings = reportRenderer.match(/<button\b[^>]*>/g) ?? [];
    const implicitButtons = buttonOpenings.filter(
      (button) => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
    );

    expect(buttonOpenings).toHaveLength(4);
    expect(implicitButtons).toEqual([]);
  });
});
