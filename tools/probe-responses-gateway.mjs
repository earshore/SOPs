#!/usr/bin/env node
/**
 * Live probe for OpenAI-compatible /v1/responses (new-api gateways).
 *
 * Usage:
 *   NEW_API_KEY=sk-... node tools/probe-responses-gateway.mjs
 *   OPENCLAW_NEW_API_KEY=sk-... node tools/probe-responses-gateway.mjs
 *
 * Optional:
 *   NEW_API_ENDPOINT=https://host/v1
 *   RESPONSES_PROBE_MODEL=gpt-5.5
 *
 * Does not print secrets. Paste summary rows into
 * docs/superpowers/specs/appendix-model-reasoning-gateway.md or
 * docs/superpowers/specs/2026-07-24-responses-capability-roadmap.md
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
    body = { _raw: text.slice(0, 400) };
  }
  return { status: res.status, body, text };
}

async function responses(model, extra = {}) {
  return getJson(`${endpoint}/responses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      input: 'Reply with the single word: pong',
      max_output_tokens: 64,
      store: false,
      stream: false,
      ...extra,
    }),
  });
}

function outputPreview(body) {
  if (!body || typeof body !== 'object') return '';
  if (typeof body.output_text === 'string') return body.output_text.slice(0, 80);
  const out = body.output;
  if (!Array.isArray(out)) return '';
  const parts = [];
  for (const item of out) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (typeof c?.text === 'string') parts.push(c.text);
      }
    }
  }
  return parts.join('').slice(0, 80);
}

function row(label, result) {
  const ok = result.status === 200;
  const id = result.body?.id;
  const preview = outputPreview(result.body);
  const err =
    result.body?.error?.message ||
    (typeof result.body?._raw === 'string' ? result.body._raw.slice(0, 120) : '');
  console.log(
    `| ${label} | ${ok ? 'pass' : 'fail'} | status=${result.status}` +
      `${id ? ` id=${id}` : ''}` +
      `${preview ? ` text="${preview.replace(/\n/g, ' ')}"` : ''}` +
      `${!ok && err ? ` err=${JSON.stringify(err).slice(0, 120)}` : ''} |`
  );
}

const modelsRes = await getJson(`${endpoint}/models`, { headers });
if (modelsRes.status !== 200) {
  console.error(`GET /models failed: ${modelsRes.status}`);
  process.exit(1);
}
const ids = (modelsRes.body?.data || []).map(m => m.id).filter(Boolean);
console.log(`endpoint=${endpoint}`);
console.log(`models(${ids.length}): ${ids.slice(0, 20).join(', ')}${ids.length > 20 ? '…' : ''}`);

const forced = process.env.RESPONSES_PROBE_MODEL;
const preferred = ids.filter(id => /gpt-5|o3|o1|o4/i.test(id));
const model =
  forced ||
  preferred[0] ||
  ids.find(id => /gpt|claude|grok|deepseek/i.test(id)) ||
  ids[0];

if (!model) {
  console.error('No models available to probe.');
  process.exit(1);
}

console.log(`\n## Responses probe model=${model}\n`);
console.log('| Case | Result | Detail |');
console.log('| ---- | ------ | ------ |');

row('plain text', await responses(model));
row(
  'reasoning.effort=low',
  await responses(model, { reasoning: { effort: 'low' } })
);
row(
  'text.format json_object',
  await responses(model, {
    input: 'Return JSON object with key ok set to true only.',
    text: { format: { type: 'json_object' } },
  })
);
row(
  'store=true',
  await responses(model, { store: true })
);

// previous_response_id: chain if first call returned id
const first = await responses(model, { store: true, input: 'Say hi in one word.' });
const prevId = first.body?.id;
if (first.status === 200 && prevId) {
  row(
    'previous_response_id turn2',
    await responses(model, {
      store: true,
      previous_response_id: prevId,
      input: 'Reply with one word: ok',
    })
  );
} else {
  console.log('| previous_response_id turn2 | skip | no id from store=true turn |');
}

// stream probe (status only)
const streamRes = await fetch(`${endpoint}/responses`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    model,
    input: 'Count 1 2 3',
    stream: true,
    store: false,
    max_output_tokens: 32,
  }),
});
const streamText = await streamRes.text();
const hasDelta = /output_text\.delta|content_part\.delta/.test(streamText);
console.log(
  `| stream SSE | ${streamRes.status === 200 ? 'pass' : 'fail'} | status=${streamRes.status} hasTextDelta=${hasDelta} bytes=${streamText.length} |`
);

console.log('\nDone. Copy rows into the responses capability roadmap / appendix.');
