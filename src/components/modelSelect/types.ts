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
  /** 模型列表加载完成（初始化 / 切换 provider 后）：宿主可在此重放线程级选中。 */
  onReady?(): void;
  /**
   * 选择持久化范围（默认 'none'）：
   * - 'system': 写 provider config.model（系统全局 fallback）；
   * - 'app': 仅写当前工具目标的默认模型；
   * - 'none': 组件不写存储，由宿主保存会话等更低层状态。
   */
  persist?: 'system' | 'app' | 'none';
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
  /**
   * 编程式选中模型：仅同步组件 state + 重渲染 select。
   * - 模型不在当前 options 列表时 no-op（调用方负责先 fallback 解析）；
   * - 与当前选中相同则直接返回（避免无谓重绘/闪烁）；
   * - persist: true 时才调 persistSelectedModel（默认 false = UI-only，绝不写
   *   工具策略默认模型 / provider config）；
   * - 不触发 change 事件、不调 onModelChange（宿主自行决定副作用）。
   */
  setModel(model: string, opts?: { persist?: boolean }): void;
  /** 卸载时调用：移除事件监听 */
  destroy(): void;
}
