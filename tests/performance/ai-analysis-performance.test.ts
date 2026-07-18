import { test } from '@playwright/test';
import { runLighthousePageAudit } from './lighthousePageAudit';

test.use({ launchOptions: { args: ['--remote-debugging-port=9222'] } });

test('AI Analysis meets the release performance budget', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  await runLighthousePageAudit({
    page,
    baseURL,
    expectedHeading: 'AI 智能分析',
    label: 'AI Analysis',
    reportName: 'ai-analysis',
    route: '/app-center/master-analysis/ai-analysis',
  });
});
