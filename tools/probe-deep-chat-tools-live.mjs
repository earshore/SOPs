/**
 * Pure-node live probe (no Vite/window). Mirrors Deep Chat tool loop.
 * OPENCLAW_NEW_API_KEY=... node tools/probe-deep-chat-tools-live.mjs
 */
const endpoint = (
  process.env.NEW_API_ENDPOINT ||
  process.env.OPENCLAW_NEW_API_ENDPOINT ||
  'https://new.hongecb.store/v1'
).replace(/\/$/, '');
const key = process.env.OPENCLAW_NEW_API_KEY || process.env.NEW_API_KEY || '';
if (!key) {
  console.error('Missing API key');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

const toolsChat = [
  {
    type: 'function',
    function: {
      name: 'search_x',
      description: 'Search X',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Web search',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
];
const toolsFlat = toolsChat.map(t => ({
  type: 'function',
  name: t.function.name,
  description: t.function.description,
  parameters: t.function.parameters,
}));

const user = '搜一下X上关于AI圈有哪些新闻';

async function readSse(res) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let content = '';
  let reasoning = '';
  const toolByIndex = new Map();
  let finish = null;
  let lastPayload = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      let p;
      try {
        p = JSON.parse(data);
      } catch {
        continue;
      }
      lastPayload = p;
      const d = p.choices?.[0]?.delta || {};
      if (typeof d.content === 'string') content += d.content;
      if (typeof d.reasoning_content === 'string') reasoning += d.reasoning_content;
      if (Array.isArray(d.tool_calls)) {
        for (const tc of d.tool_calls) {
          const idx = typeof tc.index === 'number' ? tc.index : 0;
          const cur = toolByIndex.get(idx) || {
            id: '',
            type: 'function',
            function: { name: '', arguments: '' },
          };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.function.name += tc.function.name;
          if (typeof tc.function?.arguments === 'string')
            cur.function.arguments += tc.function.arguments;
          toolByIndex.set(idx, cur);
        }
      }
      if (p.choices?.[0]?.finish_reason) finish = p.choices[0].finish_reason;
      // responses events
      if (p.type && String(p.type).includes('function_call')) {
        /* keep lastPayload */
      }
    }
  }
  return {
    content,
    reasoning,
    toolCalls: [...toolByIndex.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v)
      .filter(v => v.id && v.function.name),
    finish,
    lastPayload,
  };
}

async function chatNonStream(messages, extra = {}) {
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages,
      stream: false,
      tools: toolsChat,
      max_tokens: 1000,
      ...extra,
    }),
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function chatStreamLoop() {
  console.log('\n=== chat stream+tool loop deepseek ===');
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: user }],
      stream: true,
      tools: toolsChat,
      max_tokens: 1000,
    }),
  });
  console.log('stream status', res.status, res.headers.get('content-type'));
  if (!res.ok) {
    console.log('stream fail', (await res.text()).slice(0, 300));
    return;
  }
  const first = await readSse(res);
  console.log('hop1 finish', first.finish, 'contentLen', first.content.length, 'reasoningLen', first.reasoning.length);
  console.log('hop1 tools', first.toolCalls.map(t => t.function.name));
  console.log('hop1 content', JSON.stringify(first.content.slice(0, 120)));

  let messages = [{ role: 'user', content: user }];
  let toolCalls = first.toolCalls;
  let content = first.content;
  let rounds = 0;
  while (toolCalls.length && rounds < 4) {
    rounds++;
    messages.push({
      role: 'assistant',
      content: content || null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: tc.function,
      })),
    });
    for (const tc of toolCalls) {
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify({
          resultsText: 'OpenAI news; Claude update; Grok launch; Gemini release.',
        }),
      });
    }
    const hop = await chatNonStream(messages);
    console.log(
      `hop${rounds + 1} status`,
      hop.status,
      'finish',
      hop.json?.choices?.[0]?.finish_reason,
      'keys',
      hop.json ? Object.keys(hop.json) : null
    );
    if (hop.status !== 200) {
      console.log('FAIL body', JSON.stringify(hop.json).slice(0, 400));
      return;
    }
    // strict zod-ish
    const j = hop.json;
    const msg = j?.choices?.[0]?.message;
    const shapeOk =
      typeof j?.id === 'string' &&
      typeof j?.object === 'string' &&
      Array.isArray(j?.choices) &&
      j.choices.length > 0 &&
      msg &&
      (msg.content === null || msg.content === undefined || typeof msg.content === 'string');
    console.log('shapeOk', shapeOk, 'contentType', msg?.content === null ? 'null' : typeof msg?.content);
    if (!shapeOk) {
      console.log('FORMAT ABNORMAL sample', JSON.stringify(j).slice(0, 600));
      return;
    }
    content = msg.content || '';
    toolCalls = (msg.tool_calls || []).map(tc => ({
      id: tc.id,
      type: 'function',
      function: {
        name: tc.function?.name || '',
        arguments:
          typeof tc.function?.arguments === 'string'
            ? tc.function.arguments
            : JSON.stringify(tc.function?.arguments || {}),
      },
    }));
    console.log(
      `hop${rounds + 1} tools`,
      toolCalls.map(t => t.function.name),
      'contentHead',
      JSON.stringify(content.slice(0, 160))
    );
    if (!toolCalls.length) {
      console.log('FINAL OK', JSON.stringify(content.slice(0, 300)));
      return;
    }
  }
  console.log('ended with pending tools or max rounds, last content', JSON.stringify(content.slice(0, 200)));
}

async function responsesProbe(model) {
  console.log(`\n=== responses ${model} + tools ===`);
  const res = await fetch(`${endpoint}/responses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      input: user,
      stream: false,
      store: false,
      tools: toolsFlat,
      max_output_tokens: 1200,
    }),
  });
  const json = await res.json();
  console.log('status', res.status, 'respStatus', json?.status, 'outputTypes', (json?.output || []).map(o => o?.type));
  if (json?.error) console.log('error', json.error.message?.slice(0, 200));
  for (const item of json?.output || []) {
    if (item.type === 'function_call') {
      console.log('function_call', item.name, item.call_id, String(item.arguments || '').slice(0, 100));
    }
    if (item.type === 'message') {
      const texts = (item.content || [])
        .filter(p => p.type === 'output_text')
        .map(p => p.text)
        .join('');
      console.log('message text', JSON.stringify(texts.slice(0, 200)));
    }
    if (item.type === 'reasoning') {
      console.log('reasoning summary len', JSON.stringify(item.summary || '').length);
    }
  }
  if (!json?.output?.length) {
    console.log('EMPTY OUTPUT body keys', Object.keys(json || {}), JSON.stringify(json).slice(0, 400));
  }

  // if function_call, continue stateless
  const calls = (json?.output || []).filter(o => o.type === 'function_call');
  if (calls.length) {
    const follow = await fetch(`${endpoint}/responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        stream: false,
        store: false,
        tools: toolsFlat,
        max_output_tokens: 1200,
        input: [
          { role: 'user', content: user },
          ...calls.map(c => ({
            type: 'function_call',
            call_id: c.call_id,
            name: c.name,
            arguments: c.arguments,
          })),
          ...calls.map(c => ({
            type: 'function_call_output',
            call_id: c.call_id,
            output: JSON.stringify({
              resultsText: 'OpenAI news; Claude update; Grok launch; Gemini release.',
            }),
          })),
        ],
      }),
    });
    const fj = await follow.json();
    console.log(
      'follow status',
      follow.status,
      'respStatus',
      fj?.status,
      'types',
      (fj?.output || []).map(o => o?.type)
    );
    const msg = (fj?.output || []).find(o => o.type === 'message');
    const texts = (msg?.content || [])
      .filter(p => p.type === 'output_text')
      .map(p => p.text)
      .join('');
    console.log('follow text', JSON.stringify(texts.slice(0, 300)));
    if (!texts.trim()) console.log('follow empty body', JSON.stringify(fj).slice(0, 500));
  }
}

await chatStreamLoop();
await responsesProbe('deepseek-v4-flash');
await responsesProbe('grok-4.5');
console.log('\nDONE');
