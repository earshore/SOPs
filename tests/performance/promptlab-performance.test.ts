import { test } from '@playwright/test';
import { runLighthousePageAudit } from './lighthousePageAudit';

test.use({ launchOptions: { args: ['--remote-debugging-port=9222'] } });

test('PromptLab meets the release performance budget', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  await runLighthousePageAudit({
    page,
    baseURL,
    expectedHeading: 'Listing 炼金术工场',
    label: 'PromptLab',
    reportName: 'promptlab',
    route: '/app-center/master-analysis/promptlab',
  });
});
