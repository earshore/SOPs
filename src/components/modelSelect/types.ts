// src/components/modelSelect/types.ts
// ================================================================
// ModelSelect 公共类型（唯一 SSOT）。
// 页面只允许从本文件（或组件出口）取类型，禁止在页面自建等效类型。
// ================================================================

/**
 * 模型选项：string（模型 id）或对象（id + 展示元数据）。
 * 与 `LLMProviderConfig['models']` 元素结构一致。
 */
export type ModelOption =
  string | { id: string; name?: string; context?: number; features?: string[] };

/** 状态机状态：idle → fetching → ready / error */
export type ModelSelectStatus = 'idle' | 'fetching' | 'ready' | 'error';

/** 组件状态（渲染层输入，纯数据） */
export interface ModelSelectState {
  status: ModelSelectStatus;
  provider: string;
  models: ModelOption[];
  selectedModel: string;
  lastError?: string;
}

/**
 * 数据来源绑定：
 * - `targetId`: `toolStrategyService.TOOL_STRATEGY_TARGETS` 中的 id；
 *   Settings 全局区没有工具目标时传 'llm-global'（组件对该 id 跳过 strategy 回写）。
 * - `provider`: 当前活跃 LLM 提供商。
 */
export interface ModelSelectSource {
  targetId: string;
  provider: string;
}

export interface ModelSelectHooks {
  /** 选中模型变化；组件不代做能力控件联动，由宿主决定后续动作。 */
  onModelChange?(model: string): void;
  /**
   * 持久化模式（默认 'strategy'）：
   * - 'strategy': 立即写 provider config + 工具策略默认模型；
   * - 'dirty': provider config 由宿主表单保存，组件仍负责工具策略写入。
   */
  persist?: 'strategy' | 'dirty';
  /**
   * 覆盖成功 toast 与兜底提示（默认走 showToast）。
   * showLlmFailureToast 的错误 UX 不替换。
   */
  onToast?(message: string, type: 'success' | 'error' | 'warning' | 'info'): void;
  /**
   * 刷新成功回调（写盘后触发）。宿主需要同步会话状态（如 Deep Chat
   * 的 sessionState）或联动能力控件时使用。
   */
  onRefresh?(result: { models: ModelOption[]; selectedModel: string }): void;
}

export interface ModelSelectController {
  /** 重新获取模型列表（fetching 态防重入） */
  refresh(): Promise<void>;
  /** 切换 provider 并重新加载选项 */
  setProvider(provider: string): Promise<void>;
  /** 卸载时调用：移除事件监听 */
  destroy(): void;
}
