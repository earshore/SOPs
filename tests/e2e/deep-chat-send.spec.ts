import { expect, test, type Page } from '@playwright/test';

const DEEP_CHAT_ROUTE = '/#/app-center/playground/deep-chat';
const MOCK_PROVIDER = 'playwright_mock';
const MOCK_MODEL = 'mock-chat-model';
const MOCK_ENDPOINT = 'http://localhost:5173/mock-llm';
const USER_PROMPT = '请用一句话确认 Deep Chat 发送正常';
const ASSISTANT_REPLY = 'Deep Chat 浏览器发送正常';
const GENERATED_PROMPT_ID = 'deep-chat-generated-prompt-send-test';
const GENERATED_PROMPT_MARKER = 'PLAYWRIGHT_GENERATED_PROMPT_LONG_DRAFT';
const GENERATED_PROMPT_REPLY = 'Prompt 生成链路发送正常';
const GENERATED_PROMPT = createLongGeneratedPrompt();

function createLongGeneratedPrompt(): string {
  const intro = [
    '# ROLE',
    'Act as a senior Amazon listing strategist.',
    '',
    '# TASK',
    `Use this generated Prompt marker: ${GENERATED_PROMPT_MARKER}.`,
    'Create a concise response confirming that the generated Prompt can be sent from Deep Chat.',
  ].join('\n');
  const section = [
    '',
    '# GENERATED PROMPT CONTEXT',
    'Focus on keyword hierarchy, customer intent, benefit framing, evidence gaps, compliance, and conversion structure.',
    'Keep the output practical and formatted for an operator who is testing the Deep Chat generated Prompt workflow.',
  ].join('\n');
  let prompt = intro;

  while (prompt.length <= 13000) {
    prompt += section;
  }

  return prompt;
}

async function seedMockProviderStorage(page: Page, promptDraft?: string): Promise<void> {
  await page.addInitScript(
    ({ endpoint, model, promptDraft, provider }) => {
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

      if (promptDraft) {
        const now = Date.now();
        window.localStorage.setItem(
          'app-storage',
          JSON.stringify({
            state: {
              promptlab: {
                history: [
                  {
                    asins: ['B0PROMPT001'],
                    generatedAt: new Date(now).toISOString(),
                    id: 'deep-chat-generated-prompt-send-test',
                    marketplace: 'US',
                    prompt: promptDraft,
                    promptType: 'listing',
                    response: '',
                    timestamp: now,
                  },
                ],
              },
            },
            version: 0,
          })
        );
      }
    },
    { endpoint: MOCK_ENDPOINT, model: MOCK_MODEL, promptDraft, provider: MOCK_PROVIDER }
  );
}

async function mockLLMStream(page: Page, chunks: string[]): Promise<void> {
  await page.route('**/mock-llm/chat/completions', async route => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      body: [...chunks.map(chunk => `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}`), 'data: [DONE]', ''].join(
        '\n\n'
      ),
    });
  });
}

async function openDeepChatAndRefreshMockConfig(page: Page): Promise<void> {
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
}

test('Deep Chat sends a message and renders the assistant response', async ({ page }) => {
  await seedMockProviderStorage(page);
  await mockLLMStream(page, ['Deep Chat ', '浏览器发送正常']);
  await openDeepChatAndRefreshMockConfig(page);

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

test('uses a generated Prompt draft and sends it with the raised budget', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 768 });
  await seedMockProviderStorage(page, GENERATED_PROMPT);
  await mockLLMStream(page, ['Prompt 生成', '链路发送正常']);
  await openDeepChatAndRefreshMockConfig(page);

  const usePromptButton = page.locator(`[data-use-prompt-draft-id="${GENERATED_PROMPT_ID}"]`);
  await expect(usePromptButton).toBeVisible();
  await usePromptButton.click();

  const chatInput = page.locator('#playground-chat #text-input');
  await expect(chatInput).toContainText(GENERATED_PROMPT_MARKER, { timeout: 5000 });

  const requestPromise = page.waitForRequest('**/mock-llm/chat/completions');
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
  expect(latestMessage?.role).toBe('user');
  expect(latestMessage?.content).toContain(GENERATED_PROMPT_MARKER);
  expect(latestMessage?.content?.length).toBeGreaterThan(12000);
  expect(latestMessage?.content?.length).toBeLessThanOrEqual(24000);

  await expect(page.locator('#playground-chat')).toContainText(GENERATED_PROMPT_REPLY, {
    timeout: 10000,
  });
});

test('renders a visible error when the model stream returns no content', async ({ page }) => {
  await seedMockProviderStorage(page);
  await mockLLMStream(page, []);
  await openDeepChatAndRefreshMockConfig(page);

  const chatInput = page.locator('#playground-chat #text-input');
  await expect(chatInput).toBeVisible();
  await chatInput.fill('请触发空响应回显测试');
  await chatInput.press('Enter');

  await expect(page.locator('#playground-chat')).toContainText(
    '请求失败：模型没有返回任何内容，请稍后重试或检查模型/上下文配置。',
    { timeout: 10000 }
  );
});
