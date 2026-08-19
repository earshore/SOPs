// src/services/llmService.ts
// ================================================================
// 🎯 大语言模型服务 (TypeScript版本) —— barrel re-export
// 已拆分为 src/services/llm/ 子模块（Level 2 重构）
// 此文件保持全部原有导出不变
// ================================================================

export * from './llm';

// 类型导出（原 export type 块，1:1 保留；经 './llm' 中转避免 TS7006）
export type {
  ChatContentPart,
  ChatMessage,
  ChatToolCall,
  LLMConfig,
  LLMCallRequest,
  LLMOptions,
  LLMStreamMetrics,
  LLMStreamUpdate,
  MessageRole,
  ModelInfo,
} from './llm';

// 跨模块 API 表面（原 re-export 声明，1:1 保留）
export { chatContentToPlainText } from './llmTransport';
export { fetchModelsFromApi } from './llmModelList';
export {
  deleteChatCompletion,
  getChatCompletion,
  getChatCompletionMessages,
  listChatCompletions,
  updateChatCompletion,
} from './modelCapability/chatCompletionsResource';
