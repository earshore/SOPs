import { expect, test, type Page } from '@playwright/test';

const DEEP_CHAT_ROUTE = '/#/app-center/playground/deep-chat';
const PREVIEW_SELECTOR = '#deep-chat-prompt-preview-popover';
const PROMPT_SELECTOR = '[data-preview-prompt-id]';

type Point = {
  x: number;
  y: number;
};

type RectSnapshot = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type PreviewMetrics = {
  ariaHidden: string | null;
  arrowTop: string;
  describedBy: string | null;
  nearestDistance: Point | null;
  parentIsBody: boolean;
  rect: RectSnapshot;
  visible: boolean;
  withinViewport: boolean;
};

function createPromptStoragePayload() {
  const now = Date.now();

  return {
    state: {
      promptlab: {
        history: [
          {
            id: 'deep-chat-preview-test-listing',
            prompt: [
              '# ROLE',
              'Act as a Senior Listing Copywriter.',
              '',
              '# TASK',
              'Create a concise, conversion-focused listing prompt for tooltip positioning coverage.',
              '',
              '# REQUIREMENTS',
              'Keep enough content here to render the same preview surface used by generated prompts.',
            ]
              .join('\n')
              .repeat(8),
            response: '',
            timestamp: now,
            generatedAt: new Date(now).toISOString(),
            promptType: 'listing',
            marketplace: 'US',
            asins: ['B0TEST1234'],
          },
        ],
      },
    },
    version: 0,
  };
}

async function loadDeepChatWithPrompt(page: Page): Promise<void> {
  await page.addInitScript(payload => {
    window.localStorage.setItem('app-storage', JSON.stringify(payload));
  }, createPromptStoragePayload());

  await page.goto(DEEP_CHAT_ROUTE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(PROMPT_SELECTOR, { state: 'visible', timeout: 10000 });
  await page.waitForTimeout(700);
}

async function getPromptHoverPoint(page: Page): Promise<Point> {
  const box = await page.locator(PROMPT_SELECTOR).first().boundingBox();
  expect(box, 'Prompt item should have a measurable bounding box').not.toBeNull();
  if (!box) {
    throw new Error('Prompt item should have a measurable bounding box');
  }

  return {
    x: Math.round(box.x + Math.min(56, box.width / 2)),
    y: Math.round(box.y + box.height / 2),
  };
}

async function readPreviewMetrics(
  page: Page,
  pointer: Point | null = null
): Promise<PreviewMetrics> {
  return page.evaluate(
    ({ pointer, previewSelector, promptSelector }) => {
      const preview = document.querySelector(previewSelector);
      const prompt = document.querySelector(promptSelector);
      if (!preview) {
        throw new Error('Prompt preview popover is missing');
      }

      const rect = preview.getBoundingClientRect();
      const viewportBounds = [
        rect.left >= 0,
        rect.top >= 0,
        rect.right <= window.innerWidth,
        rect.bottom <= window.innerHeight,
      ];
      const nearestDistance = pointer
        ? {
            x: Math.round(Math.max(rect.left - pointer.x, 0, pointer.x - rect.right)),
            y: Math.round(Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom)),
          }
        : null;

      return {
        ariaHidden: preview.getAttribute('aria-hidden'),
        arrowTop: getComputedStyle(preview)
          .getPropertyValue('--deep-chat-prompt-preview-arrow-top')
          .trim(),
        describedBy: prompt?.getAttribute('aria-describedby') || null,
        nearestDistance,
        parentIsBody: preview.parentElement === document.body,
        rect: {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        visible: preview.classList.contains('is-visible'),
        withinViewport: viewportBounds.every(Boolean),
      };
    },
    { pointer, previewSelector: PREVIEW_SELECTOR, promptSelector: PROMPT_SELECTOR }
  );
}

test.describe('Deep Chat generated prompt preview', () => {
  test('positions the hover preview near the entry pointer without drifting', async ({ page }) => {
    await loadDeepChatWithPrompt(page);

    const pointer = await getPromptHoverPoint(page);
    await page.mouse.move(pointer.x, pointer.y);
    await page.waitForSelector(`${PREVIEW_SELECTOR}.is-visible`, { timeout: 5000 });

    const initial = await readPreviewMetrics(page, pointer);
    expect(initial.visible).toBe(true);
    expect(initial.ariaHidden).toBe('false');
    expect(initial.parentIsBody).toBe(true);
    expect(initial.withinViewport).toBe(true);
    expect(initial.nearestDistance?.x).toBeGreaterThanOrEqual(10);
    expect(initial.nearestDistance?.x).toBeLessThanOrEqual(20);
    expect(initial.nearestDistance?.y).toBeLessThanOrEqual(1);
    expect(initial.arrowTop).not.toBe('28px');

    await page.mouse.move(pointer.x + 18, pointer.y + 8);
    await page.waitForTimeout(120);

    const afterMove = await readPreviewMetrics(page);
    expect(afterMove.visible).toBe(true);
    expect(afterMove.rect).toEqual(initial.rect);
  });

  test('does not show the preview on click or keyboard focus (hover dwell only)', async ({ page }) => {
    await loadDeepChatWithPrompt(page);

    // 键盘聚焦：不弹泡
    await page.locator(PROMPT_SELECTOR).first().focus();
    await page.waitForTimeout(300);
    let metrics = await readPreviewMetrics(page);
    expect(metrics.visible).toBe(false);
    expect(metrics.ariaHidden).toBe('true');

    // 点击记录（playwright click 会把鼠标移到元素中心，先触发 pointerover 调度 dwell）：
    // 点击后立即不显示，且 dwell timer 被取消（1.3s 后仍不显示）
    await page.locator(PROMPT_SELECTOR).first().click();
    metrics = await readPreviewMetrics(page);
    expect(metrics.visible).toBe(false);
    expect(metrics.describedBy).toBe('deep-chat-prompt-preview-popover');
    await page.waitForTimeout(1300);
    metrics = await readPreviewMetrics(page);
    expect(metrics.visible).toBe(false);
    expect(metrics.ariaHidden).toBe('true');
  });

  test('hides the preview shortly after the pointer leaves the list', async ({ page }) => {
    await loadDeepChatWithPrompt(page);

    const pointer = await getPromptHoverPoint(page);
    await page.mouse.move(pointer.x, pointer.y);
    await page.waitForSelector(`${PREVIEW_SELECTOR}.is-visible`, { timeout: 5000 });

    await page.mouse.move(8, 8);
    await page.waitForSelector(`${PREVIEW_SELECTOR}.is-visible`, {
      state: 'detached',
      timeout: 5000,
    });
    const metrics = await readPreviewMetrics(page);
    expect(metrics.visible).toBe(false);
    expect(metrics.ariaHidden).toBe('true');
  });

  test('clicking use hides an already-visible preview and completes the action', async ({ page }) => {
    await loadDeepChatWithPrompt(page);

    const pointer = await getPromptHoverPoint(page);
    await page.mouse.move(pointer.x, pointer.y);
    await page.waitForSelector(`${PREVIEW_SELECTOR}.is-visible`, { timeout: 5000 });

    await page.locator('[data-use-prompt-draft-id]').first().click();
    const metrics = await readPreviewMetrics(page);
    expect(metrics.visible).toBe(false);
    // 使用 Prompt 主操作完成：新会话已创建并填入
    await expect(page.locator('.deep-chat-prompt-item.is-selected').first()).toBeVisible();
    await page.waitForTimeout(1300);
    expect((await readPreviewMetrics(page)).visible).toBe(false);
  });

  test('clicking delete does not raise the preview', async ({ page }) => {
    await loadDeepChatWithPrompt(page);

    await page.locator('[data-delete-prompt-draft-id]').first().click();
    const metrics = await readPreviewMetrics(page);
    expect(metrics.visible).toBe(false);
    await page.waitForTimeout(1300);
    expect((await readPreviewMetrics(page)).visible).toBe(false);
  });

  test('clamps the hover preview to the viewport when horizontal space is limited', async ({
    page,
  }) => {
    const viewport = { width: 904, height: 600 };
    await page.setViewportSize(viewport);
    await loadDeepChatWithPrompt(page);

    const pointer = await getPromptHoverPoint(page);
    await page.mouse.move(pointer.x, pointer.y);
    await page.waitForSelector(`${PREVIEW_SELECTOR}.is-visible`, { timeout: 5000 });

    const metrics = await readPreviewMetrics(page, pointer);
    expect(metrics.visible).toBe(true);
    expect(metrics.withinViewport).toBe(true);
    expect(metrics.rect.left).toBeGreaterThanOrEqual(16);
    expect(metrics.rect.right).toBeLessThanOrEqual(viewport.width - 16);
  });
});
