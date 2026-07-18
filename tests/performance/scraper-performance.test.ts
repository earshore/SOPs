import { test } from '@playwright/test';
import { runLighthousePageAudit } from './lighthousePageAudit';

test.use({ launchOptions: { args: ['--remote-debugging-port=9222'] } });

test('Scraper meets the release performance budget', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  await runLighthousePageAudit({
    page,
    baseURL,
    expectedHeading: '产品数据采集与管理',
    label: 'Scraper',
    reportName: 'scraper',
    route: '/app-center/master-analysis/scraper',
  });
});
