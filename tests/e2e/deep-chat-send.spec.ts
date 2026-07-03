import { expect, test } from '@playwright/test';

const DEEP_CHAT_ROUTE = '/#/app-center/playground/deep-chat';
const MOCK_PROVIDER = 'playwright_mock';
const MOCK_MODEL = 'mock-chat-model';
const MOCK_ENDPOINT = 'http://localhost:5173/mock-llm';
const USER_PROMPT = '请用一句话确认 Deep Chat 发送正常';
const ASSISTANT_REPLY = 'Deep Chat 浏览器发送正常';

test('Deep Chat sends a message and renders the assistant response', async ({ page }) => {
  await page.addInitScript(
    ({ endpoint, model, provider }) => {
      window.localStorage.clear();
      window.localStorage.setItem('llm_active_provider', JSON.stringify(provider));
      window.localStorage.setItem(
        `llm_${provider}`,
        JSON.stringify({
          apiKey: '',
          enabled: true,
          endpoint,
          model,
          provider,
        })
      );
    },
    { endpoint: MOCK_ENDPOINT, model: MOCK_MODEL, provider: MOCK_PROVIDER }
  );

  await page.route('**/mock-llm/chat/completions', async route => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      body: [
        `data: ${JSON.stringify({ choices: [{ delta: { content: 'Deep Chat ' } }] })}`,
        '',
        `data: ${JSON.stringify({ choices: [{ delta: { content: '浏览器发送正常' } }] })}`,
        '',
        'data: [DONE]',
        '',
      ].join('\n'),
    });
  });

  await page.goto(DEEP_CHAT_ROUTE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    Boolean((window as Window & { SecureStorage?: unknown }).SecureStorage)
  );
  await page.evaluate(async provider => {
    const secureStorage = (window as Window & {
      SecureStorage?: { setSecure: (key: string, value: unknown) => Promise<boolean> };
    }).SecureStorage;
    if (!secureStorage) {
      throw new Error('SecureStorage is not available');
    }
    await secureStorage.setSecure(`llm_key_${provider}`, 'playwright-test-key');
  }, MOCK_PROVIDER);

  await page.locator('#playground-refresh-config').click();
  await expect(page.locator('#playground-provider-status')).toContainText(
    `${MOCK_PROVIDER} / ${MOCK_MODEL}`
  );

  const requestPromise = page.waitForRequest('**/mock-llm/chat/completions');
  const chatInput = page.locator('#playground-chat #text-input');
  await expect(chatInput).toBeVisible();
  await chatInput.fill(USER_PROMPT);
  await chatInput.press('Enter');

  const request = await requestPromise;
  const payload = request.postDataJSON() as {
    messages?: Array<{ role?: string; content?: string }>;
    model?: string;
    stream?: boolean;
  };
  const latestMessage = payload.messages?.at(-1);
  expect(payload.model).toBe(MOCK_MODEL);
  expect(payload.stream).toBe(true);
  expect(latestMessage).toMatchObject({ role: 'user', content: USER_PROMPT });

  await expect(page.locator('#playground-chat')).toContainText(ASSISTANT_REPLY, {
    timeout: 10000,
  });
});
