#!/usr/bin/env node
/**
 * Live probe for OpenAI-compatible POST /chat/completions product subset.
 *
 * Usage:
 *   NEW_API_KEY=sk-... npm run probe:chat
 *   OPENCLAW_NEW_API_KEY=sk-... node tools/probe-chat-gateway.mjs
 *
 * Does not print secrets. Record results into
 * docs/superpowers/specs/appendix-model-reasoning-gateway.md manually.
 */

const endpoint = (
  process.env.NEW_API_ENDPOINT ||
  process.env.OPENCLAW_NEW_API_ENDPOINT ||
  'https://new.hongecb.store/v1'
).replace(/\/$/, '');
const key =
  process.env.OPENCLAW_NEW_API_KEY ||
  process.env.NEW_API_KEY ||
  process.env.SOPS_NEW_API_KEY ||
  '';

if (!key) {
  console.error('Missing API key. Set OPENCLAW_NEW_API_KEY or NEW_API_KEY.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

async function getJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, text: text.slice(0, 400) };
}

async function chat(model, extra = {}) {
  return getJson(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      stream: false,
      ...extra,
    }),
  });
}

function summarize(label, result) {
  if (result.status !== 200) {
    const errMsg =
      result.body && typeof result.body === 'object'
        ? result.body?.error?.message || JSON.stringify(result.body).slice(0, 160)
        : String(result.text || '').slice(0, 160);
    console.log(`${label}: FAIL status=${result.status} ${errMsg}`);
    return false;
  }
  const msg = result.body?.choices?.[0]?.message || {};
  const content = msg.content == null ? '' : String(msg.content);
  const finish = result.body?.choices?.[0]?.finish_reason;
  console.log(
    `${label}: OK contentLen=${content.length} finish=${finish ?? 'n/a'} keys=${Object.keys(msg).join(',')}`
  );
  return true;
}

async function probeStream(model) {
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Say hi in one word.' }],
      max_tokens: 32,
      stream: true,
    }),
  });
  if (!res.ok) {
    console.log(`stream: FAIL status=${res.status}`);
    return;
  }
  const reader = res.body?.getReader?.();
  if (!reader) {
    console.log('stream: FAIL no body reader');
    return;
  }
  const decoder = new TextDecoder();
  let chunks = 0;
  let sawData = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text.includes('data:')) {
      sawData = true;
      chunks += 1;
    }
    if (chunks >= 3) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
  }
  console.log(`stream: ${sawData ? 'OK' : 'FAIL'} sseChunks~=${chunks}`);
}

const modelsRes = await getJson(`${endpoint}/models`, { headers });
if (modelsRes.status !== 200) {
  console.error(`GET /models failed: ${modelsRes.status}`);
  process.exit(1);
}
const ids = (modelsRes.body?.data || []).map(m => m.id).filter(Boolean);
console.log(`endpoint=${endpoint}`);
console.log(`models(${ids.length}): ${ids.slice(0, 20).join(', ')}${ids.length > 20 ? '…' : ''}`);

const preferred = ids.filter(id => /grok-4|deepseek|gpt-5|o3|o4|gpt-4o/i.test(id));
const probeIds = (preferred.length > 0 ? preferred : ids).slice(0, 4);

for (const model of probeIds) {
  console.log(`\n--- ${model} ---`);
  summarize('plain', await chat(model, { max_tokens: 64 }));
  summarize('max_tokens=64', await chat(model, { max_tokens: 64 }));
  summarize('max_completion_tokens=64', await chat(model, { max_completion_tokens: 64 }));
  summarize('json_object', await chat(model, {
    max_tokens: 64,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: 'Return a JSON object with key ok set to true only.',
      },
    ],
  }));
  summarize('reasoning_effort=low', await chat(model, {
    max_tokens: 64,
    reasoning_effort: 'low',
  }));
  await probeStream(model);
}

console.log('\nDone. Paste results into appendix-model-reasoning-gateway.md if useful.');
