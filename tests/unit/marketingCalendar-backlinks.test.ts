import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const files = [
  'src/modules/sops/views/backend/inventory_replenishment/template.html',
  'src/modules/amz_hub/views/practice/promo_activities/template.html',
  'src/modules/amz_hub/views/practice/promo_tools/template.html',
];

describe('marketing calendar reverse links (L5 closed loop)', () => {
  for (const f of files) {
    it(`backlink in ${f}`, () => {
      const html = readFileSync(join(process.cwd(), f), 'utf8');
      expect(html).toContain('amz_marketing_calendar');
      expect(html).toContain('EU营销日历');
      expect(html).toContain('data-action="switch-tab"');
    });
  }
});
