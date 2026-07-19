import { createServer, type ServerResponse } from 'node:http';
import { expect, test, type Page } from '@playwright/test';

const DEEP_CHAT_ROUTE = '/#/app-center/playground/deep-chat';
const MOCK_PROVIDER = 'playwright_mock';
const MOCK_MODEL = 'mock-chat-model';
const MOCK_ENDPOINT = 'http://localhost:5173/mock-llm';
const MOCK_API_KEY = 'playwright-test-key';
const USER_PROMPT = '请用一句话确认 Deep Chat 发送正常';
const ASSISTANT_REPLY = 'Deep Chat 浏览器发送正常';
const GENERATED_PROMPT_ID = 'deep-chat-generated-prompt-send-test';
const GENERATED_PROMPT_MARKER = 'PLAYWRIGHT_GENERATED_PROMPT_LONG_DRAFT';
const GENERATED_PROMPT_REPLY = 'Prompt 生成链路发送正常';
const GENERATED_PROMPT = createLongGeneratedPrompt();

type ControlledLLMStream = {
  endpoint: string;
  firstChunk: string;
  firstChunkWritten: Promise<void>;
  release: () => void;
  reply: string;
  secondChunk: string;
  close: () => Promise<void>;
};

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

  while (prompt.length <= 30000) {
    prompt += section;
  }

  return prompt;
}

async function seedMockProviderStorage(
  page: Page,
  promptDraft?: string,
  endpoint = MOCK_ENDPOINT
): Promise<void> {
  await page.addInitScript(
    ({ apiKey, endpoint, model, promptDraft, provider }) => {
      window.localStorage.clear();
      window.localStorage.setItem('llm_active_provider', JSON.stringify(provider));
      window.localStorage.setItem(`llm_key_${provider}`, JSON.stringify(apiKey));
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
    {
      apiKey: MOCK_API_KEY,
      endpoint,
      model: MOCK_MODEL,
      promptDraft,
      provider: MOCK_PROVIDER,
    }
  );
}

function createLongStreamChunk(): string {
  return Array.from({ length: 80 }, (_, index) => `segment-${index.toString().padStart(2, '0')} `)
    .join('')
    .trimEnd();
}

function writeOpenAIStreamChunk(response: ServerResponse, chunk: string): void {
  response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
}

async function startControlledLLMStream(): Promise<ControlledLLMStream> {
  const firstChunk = 'First ';
  const secondChunk = createLongStreamChunk();
  const reply = `${firstChunk}${secondChunk}`;
  let markFirstChunkWritten = (): void => {};
  const firstChunkWritten = new Promise<void>(resolve => {
    markFirstChunkWritten = resolve;
  });
  let releaseSecondChunk = (): void => {};
  const releasePromise = new Promise<void>(resolve => {
    releaseSecondChunk = resolve;
  });
  let released = false;
  const release = (): void => {
    if (released) {
      return;
    }
    released = true;
    releaseSecondChunk();
  };
  const corsHeaders = {
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'OPTIONS, POST',
    'Access-Control-Allow-Origin': '*',
  };
  const server = createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }

    if (request.method !== 'POST' || request.url !== '/chat/completions') {
      response.writeHead(404, corsHeaders);
      response.end();
      return;
    }

    response.writeHead(200, {
      ...corsHeaders,
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
    });
    writeOpenAIStreamChunk(response, firstChunk);
    markFirstChunkWritten();
    await releasePromise;
    writeOpenAIStreamChunk(response, secondChunk);
    response.write('data: [DONE]\n\n');
    response.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Controlled LLM stream server did not expose a TCP port');
  }

  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    firstChunk,
    firstChunkWritten,
    release,
    reply,
    secondChunk,
    close: async () => {
      release();
      await new Promise<void>((resolve, reject) => {
        server.close(error => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

async function mockLLMStream(page: Page, chunks: string[]): Promise<void> {
  await page.route('**/mock-llm/chat/completions', async route => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      body: [
        ...chunks.map(
          chunk => `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}`
        ),
        'data: [DONE]',
        '',
      ].join('\n\n'),
    });
  });
}

async function holdLLMRequest(page: Page): Promise<{
  releaseHeldRequest: () => void;
  requestStarted: Promise<void>;
}> {
  let releaseHeldRequest = (): void => {};
  const releasePromise = new Promise<void>(resolve => {
    releaseHeldRequest = resolve;
  });
  let markRequestStarted = (): void => {};
  const requestStarted = new Promise<void>(resolve => {
    markRequestStarted = resolve;
  });

  await page.route('**/mock-llm/chat/completions', async route => {
    markRequestStarted();
    await releasePromise;
    await route.abort('aborted').catch(() => {});
  });

  return { releaseHeldRequest, requestStarted };
}

async function openDeepChatAndRefreshMockConfig(page: Page): Promise<void> {
  await page.goto(DEEP_CHAT_ROUTE, { waitUntil: 'domcontentloaded' });
  await page.locator('#deep-chat-refresh-config').click();
}

test('Deep Chat sends a message and renders the assistant response', async ({ page }) => {
  await seedMockProviderStorage(page);
  await mockLLMStream(page, ['Deep Chat ', '浏览器发送正常']);
  await openDeepChatAndRefreshMockConfig(page);

  const requestPromise = page.waitForRequest('**/mock-llm/chat/completions');
  const chatInput = page.locator('#deep-chat-view #text-input');
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

  await expect(page.locator('#deep-chat-view')).toContainText(ASSISTANT_REPLY, {
    timeout: 10000,
  });
});

test('continues typewriter output after switching away and back during a stream', async ({
  page,
}) => {
  const stream = await startControlledLLMStream();
  await seedMockProviderStorage(page, undefined, stream.endpoint);

  try {
    await openDeepChatAndRefreshMockConfig(page);

    const chatInput = page.locator('#deep-chat-view #text-input');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Keep typing while I switch pages');
    await chatInput.press('Enter');
    await stream.firstChunkWritten;

    const chat = page.locator('#deep-chat-view');
    await expect(chat).toContainText('First', { timeout: 10000 });

    await page.evaluate(() => {
      window.location.hash = '#/app-center';
    });
    await expect(page.locator('#deep-chat-view')).toHaveCount(0);
    await expect(page.locator('#sidebar-btn-app_center_overview')).toHaveAttribute(
      'aria-current',
      'page'
    );

    await expect(page.locator('#sidebar-btn-playground_deep_chat')).toBeVisible();
    await page.locator('#sidebar-btn-playground_deep_chat').click();
    await expect(page).toHaveURL(/#\/app-center\/playground\/deep-chat$/, { timeout: 10000 });
    const remountedChat = page.locator('#deep-chat-view');
    await expect(remountedChat).toBeVisible({ timeout: 10000 });
    await expect(remountedChat).toContainText('First', { timeout: 10000 });
    await expect(remountedChat).not.toContainText(stream.reply);

    stream.release();

    await expect(remountedChat).toContainText(
      `${stream.firstChunk}${stream.secondChunk.slice(0, 24)}`,
      { timeout: 10000 }
    );
    await expect(remountedChat).not.toContainText(stream.reply, { timeout: 100 });
    await expect(remountedChat).toContainText(stream.reply, { timeout: 10000 });
  } finally {
    await stream.close();
  }
});

test('uses a generated Prompt draft and sends it with the raised budget', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 768 });
  await seedMockProviderStorage(page, GENERATED_PROMPT);
  await mockLLMStream(page, ['Prompt 生成', '链路发送正常']);
  await openDeepChatAndRefreshMockConfig(page);

  const usePromptButton = page.locator(`[data-use-prompt-draft-id="${GENERATED_PROMPT_ID}"]`);
  await expect(usePromptButton).toBeVisible();
  await usePromptButton.click();

  const chatInput = page.locator('#deep-chat-view #text-input');
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
  expect(latestMessage?.content?.length).toBeGreaterThan(24000);
  expect(latestMessage?.content).toBe(GENERATED_PROMPT);

  await expect(page.locator('#deep-chat-view')).toContainText(GENERATED_PROMPT_REPLY, {
    timeout: 10000,
  });

  const followUpPrompt = 'Continue from the full generated Prompt context';
  await chatInput.scrollIntoViewIfNeeded();
  await chatInput.evaluate((element, value) => {
    element.textContent = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, followUpPrompt);
  await expect(chatInput).toContainText(followUpPrompt, { timeout: 5000 });

  const followUpRequestPromise = page.waitForRequest('**/mock-llm/chat/completions');
  await chatInput.press('Enter');

  const followUpRequest = await followUpRequestPromise;
  const followUpPayload = followUpRequest.postDataJSON() as {
    messages?: Array<{ role?: string; content?: string }>;
  };
  const preservedPromptMessage = followUpPayload.messages?.find(message =>
    message.content?.includes(GENERATED_PROMPT_MARKER)
  );
  expect(preservedPromptMessage?.content).toBe(GENERATED_PROMPT);
  expect(followUpPayload.messages?.some(message => message.content?.includes('内容已截断'))).toBe(
    false
  );
});

test('renders a visible error when the model stream returns no content', async ({ page }) => {
  await seedMockProviderStorage(page);
  await mockLLMStream(page, []);
  await openDeepChatAndRefreshMockConfig(page);

  const chatInput = page.locator('#deep-chat-view #text-input');
  await expect(chatInput).toBeVisible();
  await chatInput.fill('请触发空响应回显测试');
  await chatInput.press('Enter');

  await expect(page.locator('#deep-chat-view')).toContainText(
    '请求失败：模型没有返回任何内容，请稍后重试或检查模型/上下文配置。',
    { timeout: 10000 }
  );
});

test('turns the send button into a stop button and aborts the active response', async ({
  page,
}) => {
  await seedMockProviderStorage(page);
  const { releaseHeldRequest, requestStarted } = await holdLLMRequest(page);
  await openDeepChatAndRefreshMockConfig(page);

  const chatInput = page.locator('#deep-chat-view #text-input');
  await expect(chatInput).toBeVisible();
  await chatInput.fill('请保持生成中，等待停止按钮测试');
  await chatInput.press('Enter');
  await requestStarted;

  await page.waitForFunction(() => {
    const root = document.querySelector('#deep-chat-view')?.shadowRoot;
    const submitButton = root?.querySelector('.input-button.inside-end');
    return (
      submitButton?.getAttribute('data-deep-chat-stop-active') === '' &&
      submitButton.getAttribute('aria-label') === '停止生成'
    );
  });
  const stopButtonVisualState = await page.evaluate(() => {
    const root = document.querySelector('#deep-chat-view')?.shadowRoot;
    const submitButton = root?.querySelector<HTMLElement>('.input-button.inside-end');
    if (!submitButton) {
      throw new Error('Deep Chat submit button is missing');
    }

    const rect = submitButton.getBoundingClientRect();
    const style = getComputedStyle(submitButton);
    const stopIcon = root?.querySelector<HTMLElement>('#stop-icon');
    const loadingIcon = root?.querySelector<HTMLElement>('.loading-submit-button');

    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      height: Math.round(rect.height),
      loadingDisplay: loadingIcon ? getComputedStyle(loadingIcon).display : null,
      stopIconDisplay: stopIcon ? getComputedStyle(stopIcon).display : null,
      width: Math.round(rect.width),
    };
  });
  expect(stopButtonVisualState).toMatchObject({
    backgroundColor: 'rgb(220, 38, 38)',
    borderRadius: '50%',
    height: 36,
    width: 36,
  });
  expect([null, 'none']).toContain(stopButtonVisualState.loadingDisplay);
  expect([null, 'none']).toContain(stopButtonVisualState.stopIconDisplay);

  const stopButton = page.locator(
    '#deep-chat-view .input-button.inside-end[data-deep-chat-stop-active]'
  );
  await expect(stopButton).toHaveAttribute('data-deep-chat-stop-thread-id', /.+/);
  await expect(stopButton).toBeVisible();
  await stopButton.click();
  releaseHeldRequest();

  await expect(page.locator('#deep-chat-view')).toContainText('已停止生成。', {
    timeout: 10000,
  });
  await expect(page.locator('#deep-chat-pending-status')).toBeHidden();
  await expect(page.locator('#deep-chat-thread-list .deep-chat-thread-meta')).not.toContainText(
    '生成中 ·'
  );
});
