import { describe, expect, it } from 'vitest';
import { resolveManualChunkName } from '../../vite.config.js';

describe('Vite manual chunks', () => {
  it('groups raw Skill Markdown by the first character after amazon-', () => {
    expect(
      resolveManualChunkName(
        'D:/repo/vendor/amazon-skills/amazon-ppc-campaign/SKILL.md?raw'
      )
    ).toBe('skill-content-p');
    expect(
      resolveManualChunkName(
        'D:/repo/vendor/amazon-skills/amazon-listing-optimization/SKILL.md?raw'
      )
    ).toBe('skill-content-l');
  });

  it('preserves the existing vendor and application assignments', () => {
    expect(resolveManualChunkName('D:/repo/src/modules/home/index.ts')).toBeUndefined();
    expect(
      resolveManualChunkName('D:/repo/node_modules/@alpinejs/csp/dist/module.esm.js')
    ).toBe('vendor-core');
  });
});
