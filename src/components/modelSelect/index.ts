// src/components/modelSelect/index.ts
// ================================================================
// ModelSelect 组件对外出口。
// 宿主页面统一从这里 import（见 docs/guides/model-select-component-guide.md §3.2）。
// ================================================================

export { createModelSelect } from './modelSelectController';
export type {
  ModelOption,
  ModelSelectController,
  ModelSelectHooks,
  ModelSelectSource,
  ModelSelectState,
  ModelSelectStatus,
} from './types';
