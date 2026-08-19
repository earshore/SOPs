/**
 * ViewRenderer 视图渲染接口
 * ================================================================
 * 目标：将"状态 → DOM"的渲染逻辑从模块主文件中解耦，形成可测试、
 * 可替换、可独立演进的标准化渲染单元。
 *
 * 设计原则
 * --------
 * 1. 纯渲染：ViewRenderer 只负责把给定状态渲染到给定容器，不访问
 *    全局状态（store）、不发起副作用（网络、定时器、事件注册）。
 * 2. 状态显式：输入状态由调用方显式传入，使渲染逻辑可单元测试。
 * 3. 幂等与增量：实现者应支持在同一容器上重复调用（更新），
 *    避免重复追加或内存泄漏（replaceChildren / 差异更新）。
 * 4. 交互回调可选：需要交互（点击、拖拽）时通过 `handlers` 参数注入，
 *    保持渲染与交互注册分离。
 *
 * 演进路径
 * --------
 * - 阶段 A（当前）：定义接口 + 少量试点实现（纯数据驱动渲染）
 * - 阶段 B：将现有 render* 函数逐步迁移为 ViewRenderer 实现
 * - 阶段 C：配合状态订阅（Zustand selector）实现"状态变更 → 自动重渲染"
 *
 * @module ViewRenderer
 */

/**
 * 视图渲染器接口。
 *
 * @template TState - 该视图所需的状态快照类型（不可变数据）。
 */
export interface ViewRenderer<
  TState,
  THandlers = unknown
> {
  /**
   * 将状态渲染到目标容器。
   *
   * @param container - 渲染根容器。
   * @param state - 当前状态快照。
   * @param handlers - 可选的交互回调（交互绑定应由调用方在容器上注册，
   *                   此处仅传递必要的回调引用）。
   */
  render(container: HTMLElement, state: TState, handlers?: THandlers): void;
}

/**
 * 简单渲染上下文：封装渲染过程中的常用 DOM 操作，
 * 统一使用项目的安全基元（createSafeFragment 等）。
 *
 * 提供轻量工具方法，替代散落各处的原生 DOM API 调用，
 * 降低 CSP 环境下的违规风险。
 */
export class RenderContext {
  constructor(private readonly root: HTMLElement) {}

  /** 按 id 获取容器后代元素（不存在返回 null）。 */
  findById<T extends HTMLElement = HTMLElement>(id: string): T | null {
    return this.root.querySelector<T>(`#${CSS.escape(id)}`);
  }

  /** 清空容器内容（安全替换）。 */
  clear(): void {
    this.root.replaceChildren();
  }

  /**
   * 更新目标元素的文本内容（仅在值变化时写入，减少 DOM 写操作）。
   *
   * @returns 是否发生了更新。
   */
  setText(el: HTMLElement | null, text: string): boolean {
    if (!el) return false;
    if (el.textContent === text) return false;
    el.textContent = text;
    return true;
  }
}

/**
 * 组合型 ViewRenderer：按插槽（slot）将多个子渲染器组合为一个整体视图。
 *
 * 适用于"一个容器内多个独立区域分别渲染"的场景（如统计面板）。
 */
export class CompositeViewRenderer<
  TState,
  THandlers = unknown
> implements ViewRenderer<TState, THandlers>
{
  constructor(
    private readonly parts: Array<{
      /** 容器内定位方式：按 id 查找子容器。 */
      targetId: string;
      renderer: ViewRenderer<TState, THandlers>;
    }>
  ) {}

  render(container: HTMLElement, state: TState, handlers?: THandlers): void {
    for (const part of this.parts) {
      const target = container.querySelector<HTMLElement>(`#${CSS.escape(part.targetId)}`);
      if (!target) continue;
      part.renderer.render(target, state, handlers);
    }
  }
}
