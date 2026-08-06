// src/components/modelSelect/modelSelectState.ts
// ================================================================
// ModelSelect 纯状态机：无 DOM、无 IO、无副作用，可独立单测。
// 状态流：idle ─(init)→ ready；idle/ready/error ─(refresh)→ fetching ─成功→ ready / ─失败→ error
// 所有转移均为不可变更新。
// ================================================================

import type { ModelOption, ModelSelectState } from './types';

export function createInitialState(provider: string): ModelSelectState {
  return {
    status: 'idle',
    provider,
    models: [],
    selectedModel: '',
    lastError: undefined,
  };
}

/** idle/ready/error → fetching；fetching 态防重入（原状态原样返回）。 */
export function toFetching(state: ModelSelectState): ModelSelectState {
  if (state.status === 'fetching') return state;
  return { ...state, status: 'fetching', lastError: undefined };
}

export function toReady(
  state: ModelSelectState,
  models: ModelOption[],
  selectedModel: string
): ModelSelectState {
  return { ...state, status: 'ready', models, selectedModel, lastError: undefined };
}

export function toError(state: ModelSelectState, message: string): ModelSelectState {
  return { ...state, status: 'error', lastError: message };
}

/** 更换 provider：回到 idle 空选项；是否保留原选择由组合层在重新加载后决定。 */
export function setProvider(state: ModelSelectState, provider: string): ModelSelectState {
  return {
    ...state,
    status: 'idle',
    provider,
    models: [],
    selectedModel: '',
    lastError: undefined,
  };
}
