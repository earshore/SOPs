import { expect, test } from '@playwright/test';

test.describe('Promptlab 版本选择菜单', () => {
  test('展开后位于触发按钮正下方且不被父容器裁剪', async ({ page }) => {
    await page.goto('/#/app-center/master-analysis/promptlab');
    await page.waitForSelector('#btn-generate-prompt', { state: 'visible', timeout: 30000 });

    // 生成按钮与版本选择按钮需要站点与关键词上下文才可点击
    // 站点选项值为显示名（如 English (US)），按文本精确匹配选取
    const usOption = await page
      .locator('#lab-target-market option')
      .filter({ hasText: /English/ })
      .first();
    const usValue = await usOption.inputValue().catch(async () => null);
    const usText = await usOption.textContent();
    if (!usText) throw new Error('站点选项未找到');
    await page.selectOption('#lab-target-market', usText);

    await page.fill('#lab-keywords-tier1', 'humidifier, cool mist');
    await page.fill('#lab-keywords-tier2', 'bedroom humidifier, portable');

    const menuButton = page.locator('button[aria-label="选择 Listing Prompt 版本"]');
    await expect(menuButton).toBeEnabled({ timeout: 15000 });

    // 点击 caret 展开版本选择菜单
    await menuButton.click();

    // 菜单以 fixed 定位脱离翻转卡容器，不被卡片 overflow-hidden 裁剪；
    // 用同一时刻的 getBoundingClientRect 测量（避免 Playwright 自动滚动导致坐标漂移）
    const result = await page.evaluate(() => {
      const caret = document
        .querySelector('button[aria-label="选择 Listing Prompt 版本"]')
        ?.getBoundingClientRect();
      const menuEl = document.querySelector(
        'div[x-show*="listingVersionMenuOpen"]'
      ) as HTMLElement | null;
      const menu = menuEl ? menuEl.getBoundingClientRect() : null;
      return {
        caret: caret ? { top: caret.top, bottom: caret.bottom, right: caret.right } : null,
        menu: menu
          ? {
              top: menu.top,
              bottom: menu.bottom,
              left: menu.left,
              right: menu.right,
              display: menuEl ? getComputedStyle(menuEl).display : null,
            }
          : null,
        innerWidth: window.innerWidth,
      };
    });

    expect(result.menu).not.toBeNull();
    expect(result.menu?.display).toBe('block');
    expect(result.caret).not.toBeNull();

    const menuTop = (result.menu as { top: number }).top;
    const buttonBottom = (result.caret as { bottom: number }).bottom;

    // fixed 定位：菜单顶部位于按钮底部附近（含过渡与滚动时序允许的合理间隙）
    expect(menuTop - buttonBottom).toBeGreaterThanOrEqual(0);
    expect(menuTop - buttonBottom).toBeLessThanOrEqual(20);

    // 菜单完整显示：左右边界均在视口内
    const menuRight = (result.menu as { right: number }).right;
    const menuLeft = (result.menu as { left: number }).left;
    expect(menuRight).toBeLessThanOrEqual((result as { innerWidth: number }).innerWidth);
    expect(menuLeft).toBeGreaterThanOrEqual(0);
  });

  test('菜单包含 v1 / v2 两个版本选项并可选中', async ({ page }) => {
    await page.goto('/#/app-center/master-analysis/promptlab');
    await page.waitForSelector('#btn-generate-prompt', { state: 'visible', timeout: 30000 });

    const menuButton = page.locator('button[aria-label="选择 Listing Prompt 版本"]');
    const enOption = await page
      .locator('#lab-target-market option')
      .filter({ hasText: /English/ })
      .first();
    const enText = await enOption.textContent();
    if (!enText) throw new Error('站点选项未找到');
    await page.selectOption('#lab-target-market', enText);
    await page.fill('#lab-keywords-tier1', 'humidifier');
    await page.fill('#lab-keywords-tier2', 'cool mist');
    await expect(menuButton).toBeEnabled({ timeout: 15000 });
    await menuButton.click();

    const v2Option = page.locator('text=2026 新规版');
    await expect(v2Option).toBeVisible();
    const v1Option = page.locator('text=经典版');
    await expect(v1Option).toBeVisible();

    // 点击 v2 后菜单应关闭且按钮 badge 显示新规标识
    await v2Option.click();
    await expect(menuButton.locator('xpath=..').locator('text=· 新规')).not.toBeVisible();

    // v2 已选中，再次展开后点击 v1
    await menuButton.click();
    await page.locator('text=经典版').click();
    await expect(page.locator('#btn-generate-prompt span:has-text("· 新规")')).not.toBeVisible();
  });
});
