import { expect, test, type Page } from '@playwright/test';

const DEEP_CHAT_ROUTE = '/#/app-center/playground/deep-chat';
const MOCK_API_KEY = 'playwright-test-key';
const MOCK_PROVIDER = 'playwright_mock';
const MOCK_ENDPOINT = new URL(
  '/mock-llm',
  process.env.BASE_URL ?? 'http://localhost:5173'
).toString();

async function seedMockProviderStorage(page: Page): Promise<void> {
  await page.addInitScript(
    ({ apiKey, provider, endpoint }) => {
      window.localStorage.clear();
      window.localStorage.setItem('llm_active_provider', JSON.stringify(provider));
      window.localStorage.setItem(`llm_key_${provider}`, JSON.stringify(apiKey));
      window.localStorage.setItem(
        `llm_${provider}`,
        JSON.stringify({
          apiKey: '',
          enabled: true,
          endpoint,
          model: 'mock-chat-model',
          models: ['mock-chat-model', 'mock-model-b'],
          provider,
        })
      );
    },
    { apiKey: MOCK_API_KEY, provider: MOCK_PROVIDER, endpoint: MOCK_ENDPOINT }
  );
}

async function mockLLMStream(page: Page): Promise<void> {
  await page.route('**/mock-llm/chat/completions', async route => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      body: [
        'data: ' + JSON.stringify({ choices: [{ delta: { content: '回复内容一' } }] }),
        'data: ' + JSON.stringify({ choices: [{ delta: { content: '回复内容二' } }] }),
        'data: [DONE]',
        '',
      ].join('\n'),
    });
  });
}

function messageRows(page: Page): Promise<Array<{ classes: string; text: string }>> {
  return page.evaluate(() => {
    const shadow = document.querySelector('#deep-chat-view')?.shadowRoot;
    const messages = shadow?.querySelector('#messages');
    return Array.from(messages?.querySelectorAll('.outer-message-container') ?? []).map(el => ({
      classes: Array.from(el.classList).join('|'),
      text: (el.textContent || '').trim().slice(0, 40),
    }));
  });
}

test('switching the model keeps messages and shows centered system notices', async ({ page }) => {
  await seedMockProviderStorage(page);
  await mockLLMStream(page);
  await page.goto(DEEP_CHAT_ROUTE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#deep-chat-view', { timeout: 15000 });

  // 发送一轮并等流式回复完成
  const chat = page.locator('#deep-chat-view');
  await chat.locator('#text-input').fill('第一轮问题');
  await chat.locator('#text-input').press('Enter');
  await expect(chat).toContainText('回复内容一', { timeout: 15000 });
  await expect(chat).toContainText('回复内容二', { timeout: 15000 });

  // 切换模型：消息必须保留，且追加一条 system 切换通知（小字居中样式）
  await page.selectOption('[data-model-select]', 'mock-model-b');
  await expect
    .poll(async () => (await messageRows(page)).some(row => row.classes.includes('deep-chat-outer-container-role-system')))
    .toBe(true);

  const rowsAfterSwitch = await messageRows(page);
  expect(rowsAfterSwitch.some(row => row.text.includes('第一轮问题'))).toBe(true);
  expect(rowsAfterSwitch.some(row => row.text.includes('回复内容一'))).toBe(true);
  expect(rowsAfterSwitch.some(row => row.text.includes('切换至mock-model-b'))).toBe(true);

  // 通知样式：居中 + 小字 + 透明底
  const noticeStyle = await page.evaluate(() => {
    const shadow = document.querySelector('#deep-chat-view')?.shadowRoot;
    const system = shadow?.querySelector('.deep-chat-outer-container-role-system');
    if (!system) return null;
    const inner = system.querySelector('.inner-message-container');
    const bubble = system.querySelector('.message-bubble');
    return {
      justifyContent: getComputedStyle(system).justifyContent,
      alignItems: inner ? getComputedStyle(inner).alignItems : '',
      fontSize: bubble ? getComputedStyle(bubble).fontSize : '',
      backgroundColor: bubble ? getComputedStyle(bubble).backgroundColor : '',
    };
  });
  expect(noticeStyle).toMatchObject({
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0)',
  });

  // 同值 change（组件仍走 onModelChange 链路）：不重复通知、不清消息
  await page.evaluate(() => {
    document
      .querySelector<HTMLSelectElement>('[data-model-select]')
      ?.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(async () => (await messageRows(page)).length).toBe(3);
  const rowsAfterSameChange = await messageRows(page);
  expect(rowsAfterSameChange.filter(row => row.text.includes('切换至')).length).toBe(1);

  // 切回：第二条通知追加，消息与记录完整保留（不冲掉前面的切换记录）
  await page.selectOption('[data-model-select]', 'mock-chat-model');
  await expect.poll(async () => (await messageRows(page)).length).toBe(4);
  const rowsFinal = await messageRows(page);
  expect(rowsFinal.filter(row => row.text.includes('切换至mock-model-b')).length).toBe(1);
  expect(rowsFinal.some(row => row.text.includes('切换至mock-chat-model'))).toBe(true);
  expect(rowsFinal.some(row => row.text.includes('第一轮问题'))).toBe(true);
});