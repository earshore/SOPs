import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readTemplate(path: string): string {
  return readFileSync(path, 'utf8');
}

function findImplicitButtons(html: string): string[] {
  const buttonOpenings = html.match(/<button\b[^>]*>/g) ?? [];
  return buttonOpenings.filter(
    (button) => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
  );
}

describe('Business scenarios template accessibility semantics', () => {
  it('keeps scenario navigation buttons explicit about non-submit behavior', () => {
    const scenarios = [
      { path: 'src/modules/more/views/business_scenarios/usage_notice/template.html', count: 4 },
      {
        path: 'src/modules/more/views/business_scenarios/bad_review_response/template.html',
        count: 2,
      },
      {
        path: 'src/modules/more/views/business_scenarios/ad_acos_diagnosis/template.html',
        count: 2,
      },
      {
        path: 'src/modules/more/views/business_scenarios/review_monitor/template.html',
        count: 2,
      },
      {
        path: 'src/modules/more/views/business_scenarios/amazon_daily_report/template.html',
        count: 2,
      },
    ];

    scenarios.forEach(({ path, count }) => {
      const html = readTemplate(path);
      const switchTabButtons = html.match(/<button\b[^>]*data-action="switch-tab"[^>]*>/g) ?? [];

      expect(switchTabButtons).toHaveLength(count);
      expect(findImplicitButtons(html)).toEqual([]);
    });
  });
});
