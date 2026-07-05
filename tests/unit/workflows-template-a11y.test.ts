import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const template = readFileSync('src/modules/more/views/explore/workflows/template.html', 'utf8');

describe('Workflows template accessibility semantics', () => {
  it('keeps workflow switch-tab buttons explicit and keyboard-native', () => {
    const switchTabButtons = template.match(/<button\b[^>]*data-action="switch-tab"[^>]*>/g) ?? [];
    const implicitButtons = switchTabButtons.filter(
      (button) => !/\btype\s*=\s*"button"/.test(button)
    );

    expect(switchTabButtons).toHaveLength(30);
    expect(implicitButtons).toEqual([]);
  });
});
