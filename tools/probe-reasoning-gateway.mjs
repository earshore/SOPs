#!/usr/bin/env node
/**
 * Live probe for new-api reasoning fields.
 *
 * Usage:
 *   OPENCLAW_NEW_API_KEY=sk-... node tools/probe-reasoning-gateway.mjs
 *   NEW_API_KEY=sk-... node tools/probe-reasoning-gateway.mjs
 *
 * Does not print secrets. Updates nothing — write results into
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
  return { status: res.status, body, text };
}

async function chat(model, extra = {}) {
  return getJson(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'What is 17*19? Number only after short reasoning.' }],
      max_tokens: 120,
      stream: false,
      ...extra,
    }),
  });
}

function summarize(label, result) {
  if (result.status !== 200) {
    console.log(`${label}: FAIL status=${result.status}`);
    return;
  }
  const msg = result.body?.choices?.[0]?.message || {};
  const rc = msg.reasoning_content;
  const rcLen = rc == null ? 'null' : String(rc).length;
  const rt = result.body?.usage?.completion_tokens_details?.reasoning_tokens;
  console.log(
    `${label}: OK contentLen=${String(msg.content || '').length} rcLen=${rcLen} reasoning_tokens=${rt ?? 'n/a'} keys=${Object.keys(msg).join(',')}`
  );
}

const modelsRes = await getJson(`${endpoint}/models`, { headers });
if (modelsRes.status !== 200) {
  console.error(`GET /models failed: ${modelsRes.status}`);
  process.exit(1);
}
const ids = (modelsRes.body?.data || []).map(m => m.id).filter(Boolean);
console.log(`endpoint=${endpoint}`);
console.log(`models(${ids.length}): ${ids.join(', ')}`);

const targets = ids.filter(id =>
  /o1|o3|deepseek|reason|r1|grok-4/i.test(id)
);
const probeIds = targets.length > 0 ? targets.slice(0, 6) : ids.slice(0, 3);

for (const model of probeIds) {
  console.log(`\n--- ${model} ---`);
  summarize('omit', await chat(model));
  summarize('effort=low', await chat(model, { reasoning_effort: 'low' }));
}
