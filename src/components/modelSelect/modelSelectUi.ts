// src/components/modelSelect/modelSelectUi.ts
// ================================================================
// ModelSelect 渲染层：纯函数，只读 state 写 DOM，不绑定事件。
// 文案固定对齐 CONTENT_DESIGN（docs/guides/model-select-component-guide.md §4.5），禁止自造变体。
// ================================================================

import { getModelId, getModelLabel } from './modelSelectService';
import type { ModelSelectState } from './types';

/** 空 provider 时 select 的空项文案 */
const PLACEHOLDER_NO_PROVIDER = '模型未配置';
/** 有 provider 但无模型时 select 的空项文案 */
const PLACEHOLDER_NO_MODELS = '暂无可选模型';

/**
 * 渲染 select：
 * - 无 provider / 无模型：disabled + 单个空项（文案区分两种原因）；
 * - 有模型：渲染 options（label 用 getModelLabel），选中 selectedModel（失效时回退首项），启用。
 */
export function renderSelect(select: HTMLSelectElement, state: ModelSelectState): void {
  const { provider, models, selectedModel } = state;

  if (!provider || models.length === 0) {
    select.disabled = true;
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = !provider ? PLACEHOLDER_NO_PROVIDER : PLACEHOLDER_NO_MODELS;
    select.appendChild(placeholder);
    return;
  }

  select.replaceChildren();
  for (const model of models) {
    const option = document.createElement('option');
    option.value = getModelId(model);
    option.textContent = getModelLabel(model);
    select.appendChild(option);
  }
  const selectedInList = models.some(model => getModelId(model) === selectedModel);
  const first = models[0];
  select.value = selectedInList ? selectedModel : first ? getModelId(first) : '';
  select.disabled = false;
}

/**
 * 渲染刷新按钮：
 * - fetching：disabled + aria-busy=true + icon 追加 fa-spin；
 * - 无 provider：disabled；
 * - 其余：恢复 enabled 并移除 aria-busy / fa-spin。
 * icon 选择器：优先 `[data-model-select-refresh-icon]`，回退 `button i`（两种骨架均可）。
 */
export function renderRefreshButton(button: HTMLButtonElement, state: ModelSelectState): void {
  const icon =
    button.querySelector<HTMLElement>('[data-model-select-refresh-icon]') ??
    button.querySelector<HTMLElement>('i');

  if (state.status === 'fetching') {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    icon?.classList.add('fa-spin');
    return;
  }

  button.disabled = !state.provider;
  button.removeAttribute('aria-busy');
  icon?.classList.remove('fa-spin');
}

/**
 * 渲染 sr-only 状态行：
 * - 空 provider：「请先在全局设置中选择 LLM 提供商」；
 * - fetching：「正在获取可用模型」；
 * - ready：「当前模型：{model}」；
 * - error：错误摘要，role 切为 alert（非 error 恢复 status）。
 */
export function renderStatus(statusEl: HTMLElement, state: ModelSelectState): void {
  const { provider, status, selectedModel, lastError } = state;

  if (!provider) {
    statusEl.textContent = '请先在全局设置中选择 LLM 提供商';
    statusEl.setAttribute('role', 'status');
    return;
  }
  if (status === 'fetching') {
    statusEl.textContent = '正在获取可用模型';
    statusEl.setAttribute('role', 'status');
    return;
  }
  if (status === 'error') {
    statusEl.textContent = lastError ?? '';
    statusEl.setAttribute('role', 'alert');
    return;
  }
  statusEl.textContent = selectedModel ? `当前模型：${selectedModel}` : '';
  statusEl.setAttribute('role', 'status');
}
