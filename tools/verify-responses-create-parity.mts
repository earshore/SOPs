/**
 * Structural audit: Responses Create fields from buildResponsesBody.
 * Run: npx tsx tools/verify-responses-create-parity.mts
 */
import { buildResponsesBody } from '../src/services/modelCapability/applyToRequest.ts';
import { resolveModelCapability } from '../src/services/modelCapability/resolve.ts';

const baseCap = resolveModelCapability({
  provider: 'new_api',
  modelId: 'gpt-5.5',
  preferredSurface: 'responses',
});

const capability = {
  ...baseCap,
  temperatureIgnored: false,
  supportsStore: true,
  supportsPreviousResponseId: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsVision: true,
};

const body = buildResponsesBody({
  model: 'gpt-5.5',
  messages: [
    { role: 'system', content: 'You are helpful' },
    { role: 'user', content: 'hi' },
  ],
  temperature: 0.5,
  maxTokens: 200,
  stream: true,
  jsonMode: true,
  jsonSchema: {
    name: 'result',
    schema: { type: 'object', additionalProperties: true },
    strict: false,
  },
  serviceTier: 'default',
  capability,
  reasoning: { enabled: true, effort: 'medium' },
  previousResponseId: 'resp_prev',
  store: true,
  tools: [{ type: 'function', name: 'lookup', parameters: { type: 'object' } }],
  toolChoice: 'auto',
  parallelToolCalls: true,
  visionUserParts: [{ type: 'input_image', image_url: 'https://x/a.png' }],
  topP: 0.9,
  topLogprobs: 2,
  metadata: { a: 'b' },
  promptCacheKey: 'pk',
  safetyIdentifier: 'sid',
  user: 'u1',
  truncation: 'disabled',
  background: false,
  maxToolCalls: 3,
  include: ['file_search_call.results'],
});

const REQUIRED_WHEN_CONFIGURED = [
  'model',
  'input',
  'instructions',
  'stream',
  'temperature',
  'max_output_tokens',
  'text',
  'tools',
  'tool_choice',
  'parallel_tool_calls',
  'previous_response_id',
  'store',
  'service_tier',
  'reasoning',
  'top_p',
  'top_logprobs',
  'metadata',
  'prompt_cache_key',
  'safety_identifier',
  'user',
  'truncation',
  'background',
  'max_tool_calls',
  'include',
] as const;

const present = REQUIRED_WHEN_CONFIGURED.filter(k => k in body);
const missing = REQUIRED_WHEN_CONFIGURED.filter(k => !(k in body));

const report = {
  bodyKeys: Object.keys(body).sort(),
  present,
  missing,
  trueFullResponsesCreatePassThrough: missing.length === 0,
  sample: {
    top_p: body.top_p,
    metadata: body.metadata,
    prompt_cache_key: body.prompt_cache_key,
    max_tool_calls: body.max_tool_calls,
    include: body.include,
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.trueFullResponsesCreatePassThrough) {
  process.exitCode = 1;
}
