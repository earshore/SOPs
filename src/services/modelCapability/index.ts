export type {
  ApiSurface,
  EffectiveReasoningPrefs,
  EffortControlKind,
  ModelCapabilityRule,
  ModelsListEntry,
  ReasoningEffort,
  ReasoningEffortLevel,
  ReasoningUserPrefs,
  ResolveModelCapabilityInput,
  ResolvedModelCapability,
  ResponsesTransportOptions,
  SessionReasoningOverride,
  SurfaceCapability,
  SurfaceCapabilityFlags,
} from './types';
export {
  DEFAULT_API_SURFACE,
  DEFAULT_REASONING_PREFS,
  DEFAULT_REASONING_EFFORTS,
  DEFAULT_UNKNOWN_CONTEXT_WINDOW,
  REASONING_EFFORT_LEVELS,
  isReasoningEffortLevel,
} from './types';
export {
  getModelCapabilityRules,
  MODEL_CAPABILITY_CATALOG_META,
  MODEL_CAPABILITY_RULES,
} from './registry';
// Mappers also re-exported from ./registry for diagnostics; public path is ./mappers below.
export { matchModelPattern, resolveModelCapability, shouldShowReasoningControls } from './resolve';
export { normalizeModelIdForCapability, stripVendorPrefix } from './normalizeModelId';
export {
  clampEffort,
  isEffortDemoted,
  normalizeReasoningUserPrefs,
  resolveEffectiveReasoning,
} from './prefs';
export {
  applyReasoningToRequestBody,
  buildChatCompletionsBody,
  buildRequestBodyForSurface,
  buildResponsesBody,
  messagesToResponsesInput,
  shouldForceChatCompletionsForJsonMode,
  splitMessagesForResponses,
} from './applyToRequest';
export {
  extractResponsesId,
  extractResponsesIdFromStreamEvent,
  describeResponsesEmptyBody,
  extractAssistantTextFromResponsesOrChat,
  extractResponsesOutputText,
  extractResponsesReasoningSummary,
  extractResponsesRefusal,
  getResponsesReasoningStreamDelta,
  getResponsesStreamTextDelta,
  harvestResponsesReasoningIncrement,
  isResponsesTerminalEvent,
} from './responsesParse';
export {
  OPENAI_PLATFORM_CAPABILITY_MATRIX,
  listCapabilitiesByStatus,
  summarizePlatformCapability,
  type PlatformCapabilityRow,
  type PlatformCapabilityStatus,
} from './platformCapability';
export {
  applyVisionPartsToResponsesInput,
  extractLatestUserInputForResponsesChain,
  type ResponsesBodyExtras,
  type ResponsesJsonSchemaFormat,
} from './applyToRequest';
export {
  buildFunctionCallItemsForReplay,
  buildFunctionCallOutputItems,
  buildToolFollowUpInputItems,
  extractResponsesFunctionCalls,
  isResponsesBuiltInToolType,
  normalizeToolsForResponses,
  RESPONSES_BUILTIN_TOOL_TYPES,
  type ResponsesBuiltInToolType,
  type ResponsesFunctionCall,
} from './responsesTools';
export {
  DEFAULT_MAX_TOOL_ROUNDS,
  processResponsesToolRound,
  type ResponsesToolExecutor,
  type ResponsesToolLoopRoundResult,
} from './responsesToolLoop';
export {
  appendChatToolRoundMessages,
  extractChatStreamToolCallDeltas,
  extractChatToolCallsFromCompletion,
  extractChatToolCallsFromMessage,
  mergeChatStreamToolCallDeltas,
  normalizeToolsForChat,
  textEmittedToChatToolCalls,
  type ChatFunctionToolCall,
  type ChatStreamToolCallDelta,
} from './chatTools';
export {
  collapseTextEmittedToolCallsForDisplay,
  parseTextEmittedToolCalls,
  stripTextEmittedToolCalls,
  textLooksLikeEmittedToolCalls,
  type TextEmittedToolCall,
} from './textToolCalls';
export {
  buildModelToolSynthesisUserMessage,
  isLocalToolFallbackText,
  isResponsesInProgressEmpty,
  synthesizeAnswerFromToolOutputs,
  TOOL_LOOP_LOCAL_FALLBACK_FOOTER,
  TOOL_LOOP_LOCAL_FALLBACK_HEADER,
  type CollectedToolOutput,
} from './toolLoopFinal';
export {
  applyVisionPartsToChatMessages,
  toChatImageUrlParts,
  type ChatContentPart,
} from './chatVision';
export {
  deleteChatCompletion,
  getChatCompletion,
  getChatCompletionMessages,
  listChatCompletions,
  updateChatCompletion,
  type ChatCompletionsResourceClientOptions,
} from './chatCompletionsResource';
export {
  buildLooseAnalysisJsonSchema,
  withStructuredAnalysisOptions,
  type StructuredAnalysisContext,
} from './structuredAnalysisOptions';
export {
  GEMINI_THINKING_BUDGET_BY_EFFORT,
  mapAnthropicOutputEffort,
  mapAnthropicOutputEffortSummarized,
  mapAnthropicThinking,
  mapGeminiThinking,
  mapOpenAiReasoningEffort,
  mapResponsesReasoning,
  readThinkingBudgetTokens,
  THINKING_BUDGET_ANSWER_HEADROOM,
} from './mappers';
export type { ApiPathId, ApiPathOption } from './apiPaths';
export {
  API_PATH_OPTIONS,
  DEFAULT_API_PATH_ID,
  apiPathIdToSurface,
  buildFullApiUrl,
  isApiPathId,
  normalizeApiPathId,
  stripTrailingSlash,
} from './apiPaths';
export {
  buildAnthropicMessagesBody,
  buildBodyForApiPath,
  buildGeminiGenerateBody,
} from './protocolBodies';
export {
  extractAnthropicMessagesText,
  extractGeminiGenerateText,
  getAnthropicStreamTextDelta,
  getGeminiStreamTextDelta,
} from './protocolParse';
