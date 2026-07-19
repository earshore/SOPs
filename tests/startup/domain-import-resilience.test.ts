import { expect, test } from '@playwright/test';

test('keeps an App Center route available when another domain module cannot load', async ({
  page,
}) => {
  test.setTimeout(60000);

  let rejectedSopsImport = false;
  await page.route('**/src/modules/sops/sops.ts*', route => {
    rejectedSopsImport = true;
    return route.abort('failed');
  });

  await page.goto('/#/app-center', {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });

  await expect.poll(() => rejectedSopsImport, { timeout: 30000 }).toBe(true);
  await expect(page).toHaveURL(/#\/app-center$/);
  await expect(page.locator('#panel-app_center')).toBeVisible({ timeout: 30000 });
});

test('returns an App Center deep link to home when the domain module cannot load', async ({
  page,
}) => {
  let rejectedAppCenterImport = false;
  await page.route('**/src/modules/app_center/app_center.ts*', route => {
    rejectedAppCenterImport = true;
    return route.abort('failed');
  });

  await page.goto('/#/app-center/playground/deep-chat', {
    waitUntil: 'domcontentloaded',
  });

  await expect.poll(() => rejectedAppCenterImport, { timeout: 15000 }).toBe(true);
  await expect(page).toHaveURL(/#\/home$/, { timeout: 15000 });
  await expect(page.locator('#panel-home')).toBeVisible();
  await expect(page.locator('#home-splash-container')).toBeVisible();
});

test('returns a SOPs route to home when the domain module cannot load', async ({ page }) => {
  let rejectedSopsImport = false;
  await page.route('**/src/modules/sops/sops.ts*', route => {
    rejectedSopsImport = true;
    return route.abort('failed');
  });

  await page.goto('/#/sops', {
    waitUntil: 'domcontentloaded',
  });

  await expect.poll(() => rejectedSopsImport, { timeout: 15000 }).toBe(true);
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.locator('#panel-home')).toBeVisible();
  await expect(page.locator('#home-splash-container')).toBeVisible();
});

test('returns a legacy App Center route to home when the domain module cannot load', async ({
  page,
}) => {
  let rejectedAppCenterImport = false;
  await page.route('**/src/modules/app_center/app_center.ts*', route => {
    rejectedAppCenterImport = true;
    return route.abort('failed');
  });

  await page.goto('/#/ppc_search_terms', {
    waitUntil: 'domcontentloaded',
  });

  await expect.poll(() => rejectedAppCenterImport, { timeout: 15000 }).toBe(true);
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.locator('#panel-home')).toBeVisible();
  await expect(page.locator('#home-splash-container')).toBeVisible();
});

test('returns later menu navigation to home when its domain module could not load', async ({
  page,
}) => {
  test.setTimeout(60000);

  let rejectedSopsImport = false;
  await page.route('**/src/modules/sops/sops.ts*', route => {
    rejectedSopsImport = true;
    return route.abort('failed');
  });

  await page.goto('/#/home', {
    waitUntil: 'domcontentloaded',
  });

  await expect.poll(() => rejectedSopsImport, { timeout: 15000 }).toBe(true);
  await expect(page.locator('#panel-home')).toBeVisible({ timeout: 15000 });

  const sopsNavigation = page.locator('#nav-sops');
  await expect(sopsNavigation.locator('..')).toHaveAttribute(
    'data-mega-menu-a11y-initialized',
    'true',
    { timeout: 30000 }
  );
  await sopsNavigation.hover();
  await expect(page.locator('#sops-mega-menu')).toHaveAttribute('aria-hidden', 'false');
  const sopsOverviewLink = page.locator('#sops-mega-menu [data-tab="sops_overview"]');
  await expect(sopsOverviewLink).toHaveAttribute('href', '#/sops');
  await expect(sopsOverviewLink).toBeVisible();
  await sopsOverviewLink.click();

  await expect(page.getByRole('alert')).toContainText('当前页面所需模块暂时无法加载');
  await expect(page).toHaveURL(/#\/home$/);
});
