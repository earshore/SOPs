// src/components/modelSelect/modelSelect.test.ts
// ModelSelect 四层：状态机 / 数据层 / 渲染层 / 组合层单测（vitest + jsdom）。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createModelSelect } from './modelSelectController';
import {
  buildModelOptions,
  dedupeModels,
  getModelLabel,
  getModelId,
  loadModelSourceData,
  persistSelectedModel,
  refreshModelCatalog,
  resolveSelectedModel,
} from './modelSelectService';
import { createInitialState, setProvider, toError, toFetching, toReady } from './modelSelectState';
import { renderRefreshButton, renderSelect, renderStatus } from './modelSelectUi';
import type { ModelOption, ModelSelectHooks, ModelSelectSource } from './types';

const mocks = vi.hoisted(() => ({
  getLLMConfigWithKey: vi.fn(),
  getLLMConfig: vi.fn(),
  setLLMConfig: vi.fn(),
  getToolTargetDefaultModel: vi.fn(),
  setToolTargetDefaultModel: vi.fn(),
  fetchModelsFromApi: vi.fn(),
  showToast: vi.fn(),
  showLlmFailureToast: vi.fn(),
  handleError: vi.fn(),
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    getLLMConfigWithKey: mocks.getLLMConfigWithKey,
    getLLMConfig: mocks.getLLMConfig,
    setLLMConfig: mocks.setLLMConfig,
  },
}));

vi.mock('@/services/toolStrategyService', () => ({
  getToolTargetDefaultModel: mocks.getToolTargetDefaultModel,
  setToolTargetDefaultModel: mocks.setToolTargetDefaultModel,
}));

vi.mock('@/services/llmModelList', () => ({
  fetchModelsFromApi: mocks.fetchModelsFromApi,
}));

vi.mock('@/common/ui', () => ({
  showToast: mocks.showToast,
}));

vi.mock('@/common/errors/llmFailureUx', () => ({
  showLlmFailureToast: mocks.showLlmFailureToast,
}));

vi.mock('@/services/errorService', () => ({
  ErrorService: { handle: mocks.handleError },
}));

// 控制器测试：preset 由组件文档契约外的基础数据决定，这里用空 preset 保持确定性。
vi.mock('@/common/config/llmProviders', () => ({
  getLlmProviderConfig: () => null,
}));

describe('modelSelectState', () => {
  it('transitions idle → fetching → ready', () => {
    let s = createInitialState('new_api');
    expect(s.status).toBe('idle');
    s = toFetching(s);
    expect(s).toMatchObject({ status: 'fetching', provider: 'new_api' });
    s = toReady(s, ['a', 'b'], 'a');
    expect(s).toMatchObject({ status: 'ready', selectedModel: 'a' });
    expect(s.models).toEqual(['a', 'b']);
  });

  it('error keeps previous models and records lastError', () => {
    const s = toError(toReady(createInitialState('p'), ['a'], 'a'), '网络不可用');
    expect(s.status).toBe('error');
    expect(s.lastError).toBe('网络不可用');
    expect(s.models).toEqual(['a']); // error 态保留上一可用选项
  });

  it('ignores re-entrant fetching (returns same reference)', () => {
    const fetching = toFetching(createInitialState('p'));
    expect(toFetching(fetching)).toBe(fetching);
  });

  it('setProvider resets to idle with empty options', () => {
    const next = setProvider(toReady(createInitialState('p'), ['a'], 'a'), 'other');
    expect(next).toMatchObject({
      provider: 'other',
      status: 'idle',
      models: [],
      selectedModel: '',
    });
  });
});

describe('modelSelectService helpers', () => {
  it('getModelId / getModelLabel handle string and object forms', () => {
    expect(getModelId('a')).toBe('a');
    expect(getModelId({ id: 'b' })).toBe('b');
    expect(getModelLabel({ id: 'b', name: 'B' })).toBe('B');
    expect(getModelLabel({ id: 'b' })).toBe('b');
    expect(getModelLabel('a')).toBe('a');
  });

  it('dedupeModels preserves first-occurrence order', () => {
    const input: ModelOption[] = [{ id: 'b', name: 'B' }, 'a', { id: 'b', name: 'B2' }, 'c', 'a'];
    expect(dedupeModels(input)).toEqual([{ id: 'b', name: 'B' }, 'a', 'c']);
  });

  it('buildModelOptions merges configured + preset and dedupes', () => {
    const options = buildModelOptions({
      configured: [{ id: 'a' }, 'b'],
      preset: ['b', 'c'],
      strategyModel: '',
      fallbackModel: '',
    });
    expect(options.map(getModelId)).toEqual(['a', 'b', 'c']);
  });

  it('buildModelOptions ensures strategyModel and fallbackModel stay visible', () => {
    const options = buildModelOptions({
      configured: [{ id: 'a' }],
      preset: [],
      strategyModel: 'strategy-x',
      fallbackModel: 'fallback-y',
    });
    expect(options.map(getModelId)).toEqual(['a', 'strategy-x', 'fallback-y']);
  });

  it('buildModelOptions does not duplicate ensured ids already present', () => {
    const options = buildModelOptions({
      configured: ['a', 'strategy-x'],
      preset: [],
      strategyModel: 'strategy-x',
      fallbackModel: 'a',
    });
    expect(options.map(getModelId)).toEqual(['a', 'strategy-x']);
  });

  it('resolveSelectedModel prioritizes strategy > config > first', () => {
    expect(resolveSelectedModel({ strategyModel: 's', configModel: 'c', models: ['f'] })).toBe('s');
    expect(resolveSelectedModel({ strategyModel: '', configModel: 'c', models: ['f'] })).toBe('c');
    expect(resolveSelectedModel({ strategyModel: '', configModel: '', models: ['f'] })).toBe('f');
  });
});

describe('modelSelectService data layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLLMConfigWithKey.mockResolvedValue({
      provider: 'new_api',
      endpoint: 'https://llm.example/v1',
      apiKey: 'secret',
      model: 'old',
    });
    mocks.fetchModelsFromApi.mockResolvedValue([
      { id: 'a', context: 1024, features: [] },
      { id: 'b', context: 2048, features: [] },
    ]);
    mocks.getToolTargetDefaultModel.mockReturnValue('b');
  });

  it('loadModelSourceData returns empty strategyModel for llm-global', async () => {
    const data = await loadModelSourceData('new_api', 'llm-global');
    expect(data.strategyModel).toBe('');
    expect(mocks.getToolTargetDefaultModel).not.toHaveBeenCalled();
  });

  it('refreshModelCatalog fetches, keeps strategy selected, and writes back', async () => {
    const result = await refreshModelCatalog({
      targetId: 'keyword-hunter-seo-process',
      provider: 'new_api',
    });
    expect(result.models.map(getModelId)).toEqual(['a', 'b']);
    expect(result.nextModel).toBe('b'); // strategy 原值仍在新列表中 → 保持
    expect(mocks.fetchModelsFromApi).toHaveBeenCalledWith(
      'new_api',
      'https://llm.example/v1',
      'secret'
    );
    expect(mocks.setLLMConfig).toHaveBeenCalledWith(
      'new_api',
      expect.objectContaining({
        provider: 'new_api',
        endpoint: 'https://llm.example/v1',
        apiKey: '',
        model: 'b',
        models: [
          { id: 'a', context: 1024, features: [] },
          { id: 'b', context: 2048, features: [] },
        ],
        enabled: true,
      })
    );
    expect(mocks.setToolTargetDefaultModel).toHaveBeenCalledWith(
      'keyword-hunter-seo-process',
      'new_api',
      'b'
    );
  });

  it('refreshModelCatalog falls back to config.model then first model', async () => {
    mocks.getToolTargetDefaultModel.mockReturnValue('');
    mocks.getLLMConfigWithKey.mockResolvedValue({
      provider: 'new_api',
      endpoint: 'e',
      apiKey: 'k',
      model: 'b',
    });
    const result = await refreshModelCatalog({ targetId: 'x', provider: 'new_api' });
    expect(result.nextModel).toBe('b');

    mocks.getLLMConfigWithKey.mockResolvedValue({
      provider: 'new_api',
      endpoint: 'e',
      apiKey: 'k',
      model: 'zzz',
    });
    const fallback = await refreshModelCatalog({ targetId: 'x', provider: 'new_api' });
    expect(fallback.nextModel).toBe('a');
  });

  it('refreshModelCatalog skips strategy read/write for llm-global', async () => {
    await refreshModelCatalog({ targetId: 'llm-global', provider: 'new_api' });
    expect(mocks.getToolTargetDefaultModel).not.toHaveBeenCalled();
    expect(mocks.setToolTargetDefaultModel).not.toHaveBeenCalled();
  });

  it('refreshModelCatalog throws standard codes for missing provider / endpoint / key', async () => {
    await expect(refreshModelCatalog({ targetId: 'x', provider: '' })).rejects.toMatchObject({
      code: 'ERR_LLM_PROVIDER_NOT_SELECTED',
    });

    mocks.getLLMConfigWithKey.mockResolvedValue(null);
    await expect(refreshModelCatalog({ targetId: 'x', provider: 'new_api' })).rejects.toMatchObject(
      {
        code: 'BIZ_NO_MODEL_CONFIGURED',
      }
    );

    mocks.getLLMConfigWithKey.mockResolvedValue({
      provider: 'new_api',
      endpoint: '',
      apiKey: 'k',
      model: '',
    });
    await expect(refreshModelCatalog({ targetId: 'x', provider: 'new_api' })).rejects.toMatchObject(
      {
        code: 'BIZ_NO_MODEL_CONFIGURED',
      }
    );

    mocks.getLLMConfigWithKey.mockResolvedValue({
      provider: 'new_api',
      endpoint: 'e',
      apiKey: '',
      model: '',
    });
    await expect(refreshModelCatalog({ targetId: 'x', provider: 'new_api' })).rejects.toMatchObject(
      {
        code: 'ERR_LLM_API_KEY_MISSING',
      }
    );
  });

  it('persistSelectedModel writes strategy + provider config in strategy mode', () => {
    mocks.getLLMConfig.mockReturnValue({
      provider: 'new_api',
      endpoint: 'https://llm.example/v1',
      model: 'old-model',
    });
    persistSelectedModel(
      { targetId: 'keyword-hunter-seo-process', provider: 'new_api' },
      'new-model'
    );
    expect(mocks.setToolTargetDefaultModel).toHaveBeenCalledWith(
      'keyword-hunter-seo-process',
      'new_api',
      'new-model'
    );
    expect(mocks.setLLMConfig).toHaveBeenCalledWith(
      'new_api',
      expect.objectContaining({ model: 'new-model', apiKey: '' })
    );
  });

  it('persistSelectedModel dirty mode skips provider config but writes strategy', () => {
    persistSelectedModel(
      { targetId: 'keyword-hunter-seo-process', provider: 'new_api' },
      'new-model',
      'dirty'
    );
    expect(mocks.setToolTargetDefaultModel).toHaveBeenCalledTimes(1);
    expect(mocks.setLLMConfig).not.toHaveBeenCalled();
  });

  it('persistSelectedModel skips strategy write for llm-global', () => {
    persistSelectedModel({ targetId: 'llm-global', provider: 'new_api' }, 'new-model');
    expect(mocks.setToolTargetDefaultModel).not.toHaveBeenCalled();
  });
});

describe('modelSelectUi', () => {
  function makeSelect(): HTMLSelectElement {
    return document.createElement('select');
  }
  function makeButton(): HTMLButtonElement {
    const button = document.createElement('button');
    return button;
  }
  function makeStatus(): HTMLElement {
    return document.createElement('span');
  }

  it('select renders placeholder and disabled without provider', () => {
    const select = makeSelect();
    renderSelect(select, createInitialState(''));
    expect(select.disabled).toBe(true);
    expect(select.options.length).toBe(1);
    expect(select.options[0]?.textContent).toBe('模型未配置');
  });

  it('select renders placeholder when provider has no models', () => {
    const select = makeSelect();
    renderSelect(select, { status: 'ready', provider: 'new_api', models: [], selectedModel: '' });
    expect(select.disabled).toBe(true);
    expect(select.options[0]?.textContent).toBe('暂无可选模型');
  });

  it('select renders options with labels and selects the selected model', () => {
    const select = makeSelect();
    renderSelect(select, {
      status: 'ready',
      provider: 'new_api',
      models: [{ id: 'a', name: 'Model A' }, 'b'],
      selectedModel: 'b',
    });
    expect(select.disabled).toBe(false);
    expect([...select.options].map(o => o.textContent)).toEqual(['Model A', 'b']);
    expect(select.value).toBe('b');
  });

  it('select falls back to first option when selectedModel is missing', () => {
    const select = makeSelect();
    renderSelect(select, {
      status: 'ready',
      provider: 'p',
      models: ['a', 'b'],
      selectedModel: 'zzz',
    });
    expect(select.value).toBe('a');
  });

  it('refresh button enters fetching state (disabled + aria-busy + fa-spin)', () => {
    const button = makeButton();
    button.appendChild(document.createElement('i'));
    renderRefreshButton(button, {
      status: 'fetching',
      provider: 'p',
      models: [],
      selectedModel: '',
    });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('i')?.classList.contains('fa-spin')).toBe(true);
  });

  it('refresh button is disabled without provider and restored otherwise', () => {
    const button = makeButton();
    button.appendChild(document.createElement('i'));
    renderRefreshButton(button, { status: 'idle', provider: '', models: [], selectedModel: '' });
    expect(button.disabled).toBe(true);

    renderRefreshButton(button, {
      status: 'ready',
      provider: 'p',
      models: ['a'],
      selectedModel: 'a',
    });
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });

  it('status line renders all states and toggles role alert on error', () => {
    const el = makeStatus();
    renderStatus(el, { status: 'idle', provider: '', models: [], selectedModel: '' });
    expect(el.textContent).toBe('请先在全局设置中选择 LLM 提供商');

    renderStatus(el, { status: 'fetching', provider: 'p', models: [], selectedModel: '' });
    expect(el.textContent).toBe('正在获取可用模型');
    expect(el.getAttribute('role')).toBe('status');

    renderStatus(el, { status: 'ready', provider: 'p', models: ['a'], selectedModel: 'a' });
    expect(el.textContent).toBe('当前模型：a');

    renderStatus(el, {
      status: 'error',
      provider: 'p',
      models: ['a'],
      selectedModel: 'a',
      lastError: '网络不可用',
    });
    expect(el.textContent).toBe('网络不可用');
    expect(el.getAttribute('role')).toBe('alert');
  });
});

describe('modelSelectController', () => {
  function mount(source: ModelSelectSource, hooks: ModelSelectHooks = {}) {
    const root = document.createElement('div');
    const select = document.createElement('select');
    select.setAttribute('data-model-select', '');
    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.setAttribute('data-model-select-refresh', '');
    const icon = document.createElement('i');
    icon.className = 'fas fa-sync-alt';
    refreshButton.appendChild(icon);
    const statusEl = document.createElement('span');
    statusEl.setAttribute('data-model-select-status', '');
    statusEl.setAttribute('role', 'status');
    root.append(select, refreshButton, statusEl);
    const controller = createModelSelect(root, source, hooks);
    return {
      root,
      controller,
      select: root.querySelector<HTMLSelectElement>('[data-model-select]')!,
      refreshButton: root.querySelector<HTMLButtonElement>('[data-model-select-refresh]')!,
      statusEl: root.querySelector<HTMLElement>('[data-model-select-status]')!,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLLMConfigWithKey.mockResolvedValue({
      provider: 'new_api',
      endpoint: 'https://llm.example/v1',
      apiKey: 'secret',
      model: 'old-model',
      models: [{ id: 'old-model' }, { id: 'other' }],
    });
    mocks.getLLMConfig.mockReturnValue({
      provider: 'new_api',
      endpoint: 'https://llm.example/v1',
      model: 'old-model',
    });
    mocks.getToolTargetDefaultModel.mockReturnValue('old-model');
  });

  it('mounts, loads options and refreshes on button click', async () => {
    mocks.fetchModelsFromApi.mockResolvedValue([
      { id: 'fresh-a', context: 1024, features: [] },
      { id: 'fresh-b', context: 2048, features: [] },
    ]);
    const onToast = vi.fn();
    const { controller, select, refreshButton } = mount(
      { targetId: 'keyword-hunter-seo-process', provider: 'new_api' },
      { onToast }
    );
    await controller.setProvider('new_api');

    expect(select.disabled).toBe(false);
    expect([...select.options].map(o => o.value)).toEqual(['old-model', 'other']);
    expect(select.value).toBe('old-model');

    refreshButton.click();
    await vi.waitFor(() => {
      expect(onToast).toHaveBeenCalledWith('成功同步 2 个模型', 'success');
    });

    expect([...select.options].map(o => o.value)).toEqual(['fresh-a', 'fresh-b']);
    expect(select.value).toBe('fresh-a'); // strategy 原值失效 → 取列表第一个
    expect(mocks.setLLMConfig).toHaveBeenCalledWith(
      'new_api',
      expect.objectContaining({ model: 'fresh-a', apiKey: '', enabled: true })
    );
    expect(mocks.setToolTargetDefaultModel).toHaveBeenCalledWith(
      'keyword-hunter-seo-process',
      'new_api',
      'fresh-a'
    );
  });

  it('calls onRefresh with models and selectedModel after successful refresh', async () => {
    const onRefresh = vi.fn();
    mocks.fetchModelsFromApi.mockResolvedValue([
      { id: 'fresh-a', context: 1024, features: [] },
      { id: 'fresh-b', context: 2048, features: [] },
    ]);
    const { refreshButton } = mount(
      { targetId: 'keyword-hunter-seo-process', provider: 'new_api' },
      { onRefresh }
    );
    refreshButton.click();
    await vi.waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    const result = onRefresh.mock.calls[0]?.[0];
    expect(result).toBeDefined();
    expect(result?.models.map((m: ModelOption) => (typeof m === 'string' ? m : m.id))).toEqual([
      'fresh-a',
      'fresh-b',
    ]);
    expect(result?.selectedModel).toBe('fresh-a');
  });

  it('persists selection and calls onModelChange on change', async () => {
    const onModelChange = vi.fn();
    const { controller, select } = mount(
      { targetId: 'keyword-hunter-seo-process', provider: 'new_api' },
      { onModelChange }
    );
    await controller.setProvider('new_api');

    select.value = 'other';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onModelChange).toHaveBeenCalledWith('other');
    expect(mocks.setToolTargetDefaultModel).toHaveBeenCalledWith(
      'keyword-hunter-seo-process',
      'new_api',
      'other'
    );
    expect(mocks.setLLMConfig).toHaveBeenCalledWith(
      'new_api',
      expect.objectContaining({ model: 'other' })
    );
  });

  it('stops reacting to events after destroy', async () => {
    const onModelChange = vi.fn();
    const { controller, select } = mount(
      { targetId: 'keyword-hunter-seo-process', provider: 'new_api' },
      { onModelChange }
    );
    await controller.setProvider('new_api');

    controller.destroy();
    select.value = 'other';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onModelChange).not.toHaveBeenCalled();
  });

  it('handles refresh failure with error status and toast', async () => {
    mocks.fetchModelsFromApi.mockRejectedValue(new Error('network down'));
    const { controller, refreshButton, statusEl } = mount({
      targetId: 'keyword-hunter-seo-process',
      provider: 'new_api',
    });
    await controller.setProvider('new_api');

    refreshButton.click();
    await vi.waitFor(() => {
      expect(mocks.showLlmFailureToast).toHaveBeenCalledWith(expect.any(Error), {
        titlePrefix: '获取模型失败: ',
      });
    });
    expect(mocks.handleError).toHaveBeenCalledWith(expect.any(Error), {
      action: 'refreshModels',
      module: 'modelSelect',
      notify: false,
    });
    expect(statusEl.getAttribute('role')).toBe('alert');
  });

  it('ignores refresh clicks while fetching', async () => {
    let resolveFetch!: (value: unknown) => void;
    mocks.fetchModelsFromApi.mockReturnValue(
      new Promise<unknown>(resolve => {
        resolveFetch = resolve;
      })
    );
    const onToast = vi.fn();
    const { controller, refreshButton } = mount(
      { targetId: 'x', provider: 'new_api' },
      { onToast }
    );
    await controller.setProvider('new_api');

    refreshButton.click();
    expect(refreshButton.disabled).toBe(true);
    expect(refreshButton.getAttribute('aria-busy')).toBe('true');

    refreshButton.click(); // 防重入：应被忽略
    resolveFetch([{ id: 'm1', context: 1024, features: [] }]);

    await vi.waitFor(() => expect(onToast).toHaveBeenCalled());
    expect(mocks.fetchModelsFromApi).toHaveBeenCalledTimes(1);
  });

  it('degrades to noop when select skeleton is missing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = document.createElement('div');
    const controller = createModelSelect(root, { targetId: 'x', provider: 'new_api' });
    expect(warn).toHaveBeenCalled();
    await expect(controller.refresh()).resolves.toBeUndefined();
    await expect(controller.setProvider('other')).resolves.toBeUndefined();
    expect(() => controller.destroy()).not.toThrow();
    warn.mockRestore();
  });
});
