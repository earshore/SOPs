/**
 * Live closed-loop probe: Deep Chat style tools on chat_completions + responses.
 * Usage: OPENCLAW_NEW_API_KEY=... npx tsx tools/probe-deep-chat-tools-live.mts
 */
// Minimal browser/Vite stubs for Node
const g = globalThis as typeof globalThis & {
  window?: { addEventListener: () => void; removeEventListener: () => void };
};
g.window = {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
// tsx does not inject Vite env; stub before service imports.
const meta = import.meta as ImportMeta & { env?: Record<string, string> };
meta.env = {
  ...(meta.env || {}),
  VITE_APP_VERSION: meta.env?.VITE_APP_VERSION || 'probe',
  DEV: 'true',
  PROD: 'false',
  MODE: 'development',
};

const { callLLM } = await import('../src/services/llmService.ts');

const endpoint = (
  process.env.NEW_API_ENDPOINT ||
  process.env.OPENCLAW_NEW_API_ENDPOINT ||
  'https://new.hongecb.store/v1'
).replace(/\/$/, '');
const key = process.env.OPENCLAW_NEW_API_KEY || process.env.NEW_API_KEY || '';
if (!key) {
  console.error('Missing OPENCLAW_NEW_API_KEY / NEW_API_KEY');
  process.exit(1);
}

const tools = [
  {
    type: 'function',
    name: 'search_x',
    description: 'Search X for AI news',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'web_search',
    description: 'Web search',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
];

const executeTool = async (args: { name: string; arguments: string; callId: string }) => {
  console.log(`[executeTool] ${args.name} callId=${args.callId} args=${args.arguments.slice(0, 120)}`);
  return JSON.stringify({
    query: args.arguments,
    source: 'probe_mock',
    resultsText:
      'X/AI: OpenAI ships new model; Anthropic Claude update; xAI Grok news; Google Gemini release.',
  });
};

const user = '搜一下X上关于AI圈有哪些新闻';

async function runCase(label: string, opts: Record<string, unknown>) {
  console.log(`\n=== ${label} ===`);
  try {
    const text = await callLLM(
      [{ role: 'user', content: user }],
      'new_api',
      endpoint,
      key,
      String(opts.model),
      {
        stream: true,
        retries: 0,
        timeout: 90_000,
        maxTokens: 1200,
        enableToolLoop: true,
        maxToolRounds: 4,
        tools,
        executeTool,
        reasoningPrefs: { enabled: false, effort: 'medium' },
        store: false,
        ...opts,
        onStreamUpdate: (u: { delta?: string; reasoningDelta?: string }) => {
          if (u.reasoningDelta) process.stdout.write('[r]');
          if (u.delta) process.stdout.write('[d]');
        },
      }
    );
    console.log(`\nOK len=${text.length} head=${JSON.stringify(text.slice(0, 220))}`);
  } catch (e) {
    const err = e as { message?: string; code?: string; statusCode?: number; name?: string };
    console.log(
      `\nFAIL name=${err.name} code=${err.code} status=${err.statusCode} msg=${String(err.message || e).slice(0, 400)}`
    );
  }
}

await runCase('chat_completions deepseek-v4-flash', {
  model: 'deepseek-v4-flash',
  apiPath: 'chat_completions',
});

await runCase('responses deepseek-v4-flash', {
  model: 'deepseek-v4-flash',
  apiPath: 'responses',
});

await runCase('responses grok-4.5', {
  model: 'grok-4.5',
  apiPath: 'responses',
});

console.log('\nDONE');
