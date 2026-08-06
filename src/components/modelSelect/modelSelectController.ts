// src/components/modelSelect/modelSelectController.ts
// ================================================================
// ModelSelect 组合层：绑定事件、生命周期、对外 API。
// 依赖方向：controller → ui / service（不直接依赖数据服务模块）。
// ================================================================

import { showLlmFailureToast } from '@/common/errors/llmFailureUx';
import { showToast } from '@/common/ui';
import { ErrorService } from '@/services/errorService';
import * as service from './modelSelectService';
import { createInitialState, toError, toFetching, toReady } from './modelSelectState';
import { renderRefreshButton, renderSelect, renderStatus } from './modelSelectUi';
import type {
  ModelSelectController,
  ModelSelectHooks,
  ModelSelectSource,
  ModelSelectState,
} from './types';

/** 与 llmModelList.isAbortError 同语义的本地判定（组合层不依赖服务模块）。 */
function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

/** 骨架不符合约定时返回的降级 controller（避免宿主崩溃）。 */
function createNoopController(): ModelSelectController {
  return {
    refresh: async () => {},
    setProvider: async () => {},
    destroy: () => {},
  };
}

/** 组合层运行上下文：createModelSelect 闭包内的共享可变状态。 */
interface ModelSelectRuntime {
  select: HTMLSelectElement;
  refreshButton: HTMLButtonElement | null;
  statusEl: HTMLElement | null;
  source: ModelSelectSource;
  hooks: ModelSelectHooks;
  persist: 'strategy' | 'dirty';
  state: ModelSelectState;
}

function renderAll(runtime: ModelSelectRuntime): void {
  renderSelect(runtime.select, runtime.state);
  if (runtime.refreshButton) renderRefreshButton(runtime.refreshButton, runtime.state);
  if (runtime.statusEl) renderStatus(runtime.statusEl, runtime.state);
}

function notify(
  runtime: ModelSelectRuntime,
  message: string,
  type: 'success' | 'error' | 'warning' | 'info'
): void {
  if (runtime.hooks.onToast) {
    runtime.hooks.onToast(message, type);
    return;
  }
  showToast(message, { type });
}

async function refreshModels(runtime: ModelSelectRuntime): Promise<void> {
  if (runtime.state.status === 'fetching') return; // 防重入
  runtime.state = toFetching(runtime.state);
  renderAll(runtime);
  try {
    const { models, nextModel } = await service.refreshModelCatalog(runtime.source);
    runtime.state = toReady(runtime.state, models, nextModel);
    renderAll(runtime);
    notify(runtime, `成功同步 ${models.length} 个模型`, 'success');
    runtime.hooks.onRefresh?.({ models, selectedModel: nextModel });
  } catch (error) {
    runtime.state = toError(runtime.state, error instanceof Error ? error.message : String(error));
    renderAll(runtime);
    // 错误 UX 固定走 showLlmFailureToast（onToast 不替换此路径）
    showLlmFailureToast(error, { titlePrefix: '获取模型失败: ' });
    if (!isAbortError(error)) {
      ErrorService.handle(error as Error, {
        action: 'refreshModels',
        module: 'modelSelect',
        notify: false,
      });
    }
  }
}

async function switchProvider(runtime: ModelSelectRuntime, provider: string): Promise<void> {
  const previous = runtime.state.selectedModel;
  runtime.source = { ...runtime.source, provider };
  runtime.state = createInitialState(provider);
  if (!provider) {
    renderAll(runtime);
    return;
  }

  const { config, preset, strategyModel } = await service.loadModelSourceData(
    provider,
    runtime.source.targetId
  );
  const fallbackModel = config?.model ?? '';
  const models = service.buildModelOptions({
    configured: config?.models,
    preset,
    strategyModel,
    fallbackModel,
  });
  // 保持当前选择若仍存在，否则按 strategy > config > 首项解析
  const resolved = service.resolveSelectedModel({
    strategyModel,
    configModel: fallbackModel,
    models,
  });
  const selectedModel =
    previous && models.some(model => service.getModelId(model) === previous) ? previous : resolved;
  runtime.state = toReady(runtime.state, models, selectedModel);
  renderAll(runtime);
}

/**
 * 创建模型选择组件。
 *
 * @param root   挂载点：`[data-model-select]` 或其包含容器（骨架见组件指南 §3）。
 * @param source targetId（工具目标 id 或 'llm-global'）+ provider。
 * @param hooks  onModelChange / persist / onToast / onRefresh（可选）。
 *
 * 找不到 `[data-model-select]` 时降级为 noop controller（console.warn 提示），
 * 避免宿主页面因骨架不符直接崩溃；刷新按钮 / 状态行可选。
 */
export function createModelSelect(
  root: HTMLElement,
  source: ModelSelectSource,
  hooks: ModelSelectHooks = {}
): ModelSelectController {
  const select = root.querySelector<HTMLSelectElement>('[data-model-select]');
  if (!select) {
    console.warn('[modelSelect] 未找到 [data-model-select] select 元素，组件降级为 noop');
    return createNoopController();
  }

  const runtime: ModelSelectRuntime = {
    select,
    refreshButton: root.querySelector<HTMLButtonElement>('[data-model-select-refresh]'),
    statusEl: root.querySelector<HTMLElement>('[data-model-select-status]'),
    source,
    hooks,
    persist: hooks.persist ?? 'strategy',
    state: createInitialState(source.provider),
  };
  const abort = new AbortController();

  runtime.refreshButton?.addEventListener('click', () => void refreshModels(runtime), {
    signal: abort.signal,
  });

  select.addEventListener(
    'change',
    () => {
      const model = select.value;
      if (!model) return;
      runtime.state = { ...runtime.state, selectedModel: model };
      service.persistSelectedModel(runtime.source, model, runtime.persist);
      hooks.onModelChange?.(model);
    },
    { signal: abort.signal }
  );

  // 初始化：加载并渲染
  void switchProvider(runtime, source.provider).catch(error => {
    console.warn('[modelSelect] 初始化加载失败', error);
  });

  return {
    refresh: () => refreshModels(runtime),
    setProvider: (provider: string) => switchProvider(runtime, provider),
    destroy: () => abort.abort(),
  };
}
