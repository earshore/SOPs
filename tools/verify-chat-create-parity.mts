/**
 * Structural audit: official Create fields emitted by buildChatCompletionsBody.
 * Run: npx tsx tools/verify-chat-create-parity.mts
 */
import { buildChatCompletionsBody } from '../src/services/modelCapability/applyToRequest.ts';
import { resolveModelCapability } from '../src/services/modelCapability/resolve.ts';

const capability = resolveModelCapability({
  provider: 'new_api',
  modelId: 'deepseek-v4-flash',
  preferredSurface: 'chat_completions',
});

const o3Cap = resolveModelCapability({
  provider: 'new_api',
  modelId: 'o3-mini',
  preferredSurface: 'chat_completions',
});

const body = buildChatCompletionsBody({
  model: 'deepseek-v4-flash',
  messages: [
    { role: 'developer', content: 'sys' },
    { role: 'user', content: 'hi' },
  ],
  temperature: 0.2,
  maxTokens: 100,
  stream: true,
  jsonMode: true,
  jsonSchema: { name: 'r', schema: { type: 'object' }, strict: false },
  serviceTier: 'default',
  capability,
  reasoning: { enabled: true, effort: 'low' },
  tools: [{ type: 'function', function: { name: 't', parameters: {} } }],
  toolChoice: 'auto',
  parallelToolCalls: true,
  visionUserParts: [{ type: 'input_image', image_url: 'https://x/a.png' }],
  topP: 0.9,
  frequencyPenalty: 0.1,
  presencePenalty: 0.2,
  stop: ['END'],
  n: 1,
  seed: 42,
  logitBias: { '1': -1 },
  logprobs: true,
  topLogprobs: 2,
  store: false,
  metadata: { a: 'b' },
  promptCacheKey: 'pk',
  safetyIdentifier: 'sid',
  user: 'legacy-user',
  modalities: ['text', 'audio'],
  audio: { voice: 'alloy', format: 'wav' },
  prediction: { type: 'content', content: 'pred' },
  webSearchOptions: { search_context_size: 'low' },
});

const o3Body = buildChatCompletionsBody({
  model: 'o3-mini',
  messages: [{ role: 'user', content: 'hi' }],
  maxTokens: 256,
  stream: false,
  capability: o3Cap,
  reasoning: { enabled: false, effort: 'off' },
});

const OFFICIAL_CREATE_KEYS = [
  'model',
  'messages',
  'stream',
  'stream_options',
  'temperature',
  'max_tokens',
  'max_completion_tokens',
  'response_format',
  'service_tier',
  'tools',
  'tool_choice',
  'parallel_tool_calls',
  'top_p',
  'frequency_penalty',
  'presence_penalty',
  'stop',
  'n',
  'seed',
  'logit_bias',
  'logprobs',
  'top_logprobs',
  'store',
  'metadata',
  'prompt_cache_key',
  'safety_identifier',
  'user',
  'reasoning_effort',
  'modalities',
  'audio',
  'prediction',
  'web_search_options',
] as const;

const present = OFFICIAL_CREATE_KEYS.filter(k => k in body);
const missing = OFFICIAL_CREATE_KEYS.filter(k => !(k in body));
// max_completion_tokens is strategy-dependent for non-reasoning chat models
const missingBlocking = missing.filter(k => k !== 'max_completion_tokens');

const msgs = body.messages as Array<{ role: string; content: unknown }>;
const userMsg = msgs.find(m => m.role === 'user');

const report = {
  capability: {
    surface: capability.apiSurface,
    supportsTools: capability.supportsTools,
    supportsVision: capability.supportsVision,
    supportsStructuredOutput: capability.supportsStructuredOutput,
  },
  bodyKeys: Object.keys(body).sort(),
  presentOfficial: present,
  missingOfficial: missing,
  missingBlocking,
  o3_tokens: {
    max_tokens: o3Body.max_tokens,
    max_completion_tokens: o3Body.max_completion_tokens,
  },
  userContentIsParts: Array.isArray(userMsg?.content),
  roles: msgs.map(m => m.role),
  trueFullCreateRequest:
    missingBlocking.length === 0 &&
    Array.isArray(userMsg?.content) &&
    o3Body.max_completion_tokens === 256,
};

console.log(JSON.stringify(report, null, 2));
if (!report.trueFullCreateRequest) {
  process.exitCode = 1;
}
