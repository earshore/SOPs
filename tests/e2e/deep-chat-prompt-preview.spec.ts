import { expect, test, type Page } from '@playwright/test';

const DEEP_CHAT_ROUTE = '/#/app-center/playground/deep-chat';
const PREVIEW_SELECTOR = '#playground-prompt-preview-popover';
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
            ].join('\n').repeat(8),
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
  await page.addInitScript((payload) => {
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

async function readPreviewMetrics(page: Page, pointer: Point | null = null): Promise<PreviewMetrics> {
  return page.evaluate(({ pointer, previewSelector, promptSelector }) => {
    const preview = document.querySelector(previewSelector);
    const prompt = document.querySelector(promptSelector);
    if (!preview) {
      throw new Error('Prompt preview popover is missing');
    }

    const rect = preview.getBoundingClientRect();
    const nearestDistance = pointer
      ? {
          x: Math.round(pointer.x < rect.left ? rect.left - pointer.x : pointer.x > rect.right ? pointer.x - rect.right : 0),
          y: Math.round(pointer.y < rect.top ? rect.top - pointer.y : pointer.y > rect.bottom ? pointer.y - rect.bottom : 0),
        }
      : null;

    return {
      ariaHidden: preview.getAttribute('aria-hidden'),
      arrowTop: getComputedStyle(preview).getPropertyValue('--playground-prompt-preview-arrow-top').trim(),
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
      withinViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight,
    };
  }, { pointer, previewSelector: PREVIEW_SELECTOR, promptSelector: PROMPT_SELECTOR });
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

  test('keeps the focus preview accessible and inside the viewport', async ({ page }) => {
    await loadDeepChatWithPrompt(page);

    await page.locator(PROMPT_SELECTOR).first().focus();
    await page.waitForSelector(`${PREVIEW_SELECTOR}.is-visible`, { timeout: 5000 });

    const metrics = await readPreviewMetrics(page);
    expect(metrics.visible).toBe(true);
    expect(metrics.ariaHidden).toBe('false');
    expect(metrics.describedBy).toBe('playground-prompt-preview-popover');
    expect(metrics.parentIsBody).toBe(true);
    expect(metrics.withinViewport).toBe(true);
    expect(metrics.arrowTop).toBe('28px');
  });

  test('clamps the hover preview to the viewport when horizontal space is limited', async ({ page }) => {
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
