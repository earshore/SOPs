/**
 * OpenAI platform / Responses API capability matrix for SOPs.
 * Source of truth for "what we implement vs gateway-dependent vs out of product scope".
 *
 * @see https://developers.openai.com/api/docs/guides/migrate-to-responses
 * @see docs/superpowers/specs/2026-07-24-responses-capability-roadmap.md
 */

export type PlatformCapabilityStatus =
  | 'implemented'
  | 'partial'
  | 'gateway_dependent'
  | 'not_in_scope';

export interface PlatformCapabilityRow {
  id: string;
  area: string;
  feature: string;
  status: PlatformCapabilityStatus;
  /** Code entry points (relative to src/ or tools/) */
  entry?: string;
  notes?: string;
}

/**
 * Full alignment matrix: product subset implemented in client + known gateway gaps.
 * Update when adding protocol fields or product surfaces.
 */
export const OPENAI_PLATFORM_CAPABILITY_MATRIX: PlatformCapabilityRow[] = [
  // --- Core Responses transport ---
  {
    id: 'resp.text',
    area: 'Responses',
    feature: 'Text input/output + stream SSE',
    status: 'implemented',
    entry: 'llmService.ts, responsesParse.ts',
  },
  {
    id: 'resp.instructions',
    area: 'Responses',
    feature: 'instructions (system) + input',
    status: 'implemented',
    entry: 'applyToRequest.ts buildResponsesBody',
  },
  {
    id: 'resp.reasoning',
    area: 'Responses',
    feature: 'reasoning.effort + summary=auto',
    status: 'implemented',
    entry: 'mappers.ts mapResponsesReasoning',
    notes: 'UI 深度思考 depends on summary channel',
  },
  {
    id: 'resp.structured',
    area: 'Responses',
    feature: 'text.format json_object / json_schema',
    status: 'implemented',
    entry: 'applyToRequest.ts, structuredAnalysisOptions.ts',
    notes: 'Analysis uses soft schema + Zod post-validate',
  },
  {
    id: 'resp.tools.custom',
    area: 'Responses',
    feature: 'Custom function tools + tool loop',
    status: 'implemented',
    entry: 'responsesTools.ts, responsesToolLoop.ts, llmService stream-first hybrid',
  },
  {
    id: 'resp.tools.builtin',
    area: 'Responses',
    feature: 'Built-in web_search / file_search / code_interpreter pass-through',
    status: 'partial',
    entry: 'responsesTools.ts RESPONSES_BUILTIN_TOOL_TYPES',
    notes:
      'Client pass-through only; no product operator UI (P2 deferred). Deep Chat custom business tools are opt-in via deepChat.enableBusinessTools (fail-closed default). Gateway may 400 on built-ins.',
  },
  {
    id: 'resp.vision',
    area: 'Responses',
    feature: 'Multimodal image input parts',
    status: 'implemented',
    entry: 'applyToRequest.ts applyVisionPartsToResponsesInput',
  },
  {
    id: 'resp.store',
    area: 'Responses',
    feature: 'store:true stateful responses',
    status: 'gateway_dependent',
    entry: 'applyToRequest.ts applyResponsesStoreField',
    notes:
      'Registry fail-closed (supportsStore=false). Never force store:true when unsupported. new.hongecb probe: 400.',
  },
  {
    id: 'resp.previous_id',
    area: 'Responses',
    feature: 'previous_response_id multi-turn',
    status: 'gateway_dependent',
    entry: 'Deep Chat lastResponseId + applyToRequest',
    notes:
      'Registry fail-closed; chain only when supportsPreviousResponseId+supportsStore. Else full messages / tool item replay. Resends instructions on chain turns.',
  },
  {
    id: 'resp.parallel_tools',
    area: 'Responses',
    feature: 'parallel_tool_calls',
    status: 'partial',
    entry: 'applyToRequest (tool_choice pass-through)',
    notes: 'Not exposed as user preference',
  },
  // --- Chat Completions product subset ---
  {
    id: 'chat.max_completion_tokens',
    area: 'Chat Completions',
    feature: 'max_completion_tokens for OpenAI reasoning models',
    status: 'implemented',
    entry: 'applyToRequest.ts applyChatMaxOutputTokens',
    notes: 'Claude/thinking keeps max_tokens; legacy chat keeps max_tokens',
  },
  {
    id: 'chat.response_schema',
    area: 'Chat Completions',
    feature: 'Modern response validation (null content, tool_calls finish_reason)',
    status: 'implemented',
    entry: 'zodSchemas.ts LLMChatCompletionResponseSchema',
  },
  {
    id: 'chat.tools',
    area: 'Chat Completions',
    feature: 'function tools + tool loop',
    status: 'not_in_scope',
    notes:
      'Use Responses path; callLLM rejects enableToolLoop outside responses (LLM_TOOLS_PATH_UNSUPPORTED)',
  },
  {
    id: 'chat.empty_body',
    area: 'Chat Completions',
    feature: 'Empty stop body → API_EMPTY_RESPONSE',
    status: 'implemented',
    entry: 'llmService.ts executeLLMAttempt',
  },
  // --- Multi-protocol ---
  {
    id: 'path.chat',
    area: 'Multi-protocol',
    feature: '/v1/chat/completions',
    status: 'implemented',
    entry: 'apiPaths.ts, protocolBodies, applyToRequest buildChatCompletionsBody',
    notes: 'Product subset: text/stream/json_object/reasoning_effort; tools require Responses',
  },
  {
    id: 'path.responses',
    area: 'Multi-protocol',
    feature: '/v1/responses',
    status: 'implemented',
    entry: 'apiPaths.ts',
  },
  {
    id: 'path.anthropic',
    area: 'Multi-protocol',
    feature: '/v1/messages (Anthropic)',
    status: 'implemented',
    entry: 'protocolBodies.ts buildAnthropicMessagesBody',
  },
  {
    id: 'path.gemini',
    area: 'Multi-protocol',
    feature: 'v1beta generateContent',
    status: 'implemented',
    entry: 'protocolBodies.ts buildGeminiGenerateBody',
  },
  // --- Product surfaces ---
  {
    id: 'product.deep_chat.tools',
    area: 'Product',
    feature: 'Deep Chat read-only business tools',
    status: 'implemented',
    entry: 'deepChatBusinessTools.ts',
    notes: 'Wired when Responses + supportsTools; stream-first hybrid',
  },
  {
    id: 'product.deep_chat.reasoning_ui',
    area: 'Product',
    feature: '深度思考 / 已完成 chrome',
    status: 'implemented',
    entry: 'deep-chat/controller.ts',
  },
  {
    id: 'product.analysis.json',
    area: 'Product',
    feature: 'Analysis withStructuredAnalysisOptions',
    status: 'implemented',
    entry: 'structuredAnalysisOptions.ts',
  },
  {
    id: 'product.settings.badges',
    area: 'Product',
    feature: 'Settings capability badges (R7)',
    status: 'implemented',
    entry: 'systemSettings',
  },
  // --- Platform not in SOPs product scope ---
  {
    id: 'platform.conversations',
    area: 'OpenAI Platform',
    feature: 'Conversations API productization',
    status: 'not_in_scope',
    notes: 'Requires store/previous_id gateway support; no product surface yet',
  },
  {
    id: 'platform.assistants',
    area: 'OpenAI Platform',
    feature: 'Assistants / Threads (legacy)',
    status: 'not_in_scope',
    notes: 'Migrate-to-responses: Assistants not reimplemented',
  },
  {
    id: 'platform.realtime',
    area: 'OpenAI Platform',
    feature: 'Realtime / WebRTC voice',
    status: 'not_in_scope',
  },
  {
    id: 'platform.batch',
    area: 'OpenAI Platform',
    feature: 'Batch API',
    status: 'not_in_scope',
  },
  {
    id: 'platform.fine_tune',
    area: 'OpenAI Platform',
    feature: 'Fine-tuning',
    status: 'not_in_scope',
  },
  {
    id: 'platform.vector_stores',
    area: 'OpenAI Platform',
    feature: 'Vector stores / file_search product UI',
    status: 'not_in_scope',
    notes: 'Protocol pass-through exists; no upload/index UI',
  },
];

export function summarizePlatformCapability(): Record<PlatformCapabilityStatus, number> {
  const summary: Record<PlatformCapabilityStatus, number> = {
    implemented: 0,
    partial: 0,
    gateway_dependent: 0,
    not_in_scope: 0,
  };
  for (const row of OPENAI_PLATFORM_CAPABILITY_MATRIX) {
    summary[row.status] += 1;
  }
  return summary;
}

export function listCapabilitiesByStatus(
  status: PlatformCapabilityStatus
): PlatformCapabilityRow[] {
  return OPENAI_PLATFORM_CAPABILITY_MATRIX.filter(row => row.status === status);
}
