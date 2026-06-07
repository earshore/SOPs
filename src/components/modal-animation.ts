/**
 * 模态框动画控制
 * 负责模态框的打开和关闭动画序列
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

import { animationManager } from '../services/animation-manager';
import {
  ANIMATION_CLASSES,
  MODAL_CONFIG,
} from '../config/animation-config';

type ModalBackdropElement = HTMLElement & {
  __modalAnimationController?: ModalAnimationController;
};

/**
 * 模态框动画选项
 */
export interface ModalAnimationOptions {
  /** 动画完成回调 */
  onComplete?: () => void;
  /** 动画开始回调 */
  onStart?: () => void;
  /** 是否跳过动画 */
  skipAnimation?: boolean;
}

/**
 * 模态框动画控制器
 */
export class ModalAnimationController {
  private backdrop: HTMLElement;
  private modal: HTMLElement;
  private isAnimating: boolean = false;

  /**
   * 创建模态框动画控制器
   * @param backdrop - 遮罩层元素
   * @param modal - 模态框内容元素
   */
  constructor(backdrop: HTMLElement, modal: HTMLElement) {
    this.backdrop = backdrop;
    this.modal = modal;
  }

  /**
   * 打开模态框动画
   * @param options - 动画选项
   */
  async open(options: ModalAnimationOptions = {}): Promise<void> {
    const { onComplete, onStart, skipAnimation = false } = options;

    // 如果正在动画中，等待完成
    if (this.isAnimating) {
      await this.waitForAnimation();
    }

    // 触发开始回调
    onStart?.();

    // 检查是否应该跳过动画
    const shouldSkip = skipAnimation || animationManager.shouldReduceMotion() || 
                       !animationManager.isCategoryEnabled('modal');

    if (shouldSkip) {
      // 直接显示，不使用动画
      this.backdrop.classList.add('show');
      this.modal.style.pointerEvents = 'auto';
      onComplete?.();
      return;
    }

    // 标记动画开始
    this.isAnimating = true;

    // 禁用模态框内容的交互
    this.modal.style.pointerEvents = 'none';

    // 显示遮罩层
    this.backdrop.style.visibility = 'visible';
    this.backdrop.style.pointerEvents = 'auto';

    // 应用进入动画类
    this.backdrop.classList.add(ANIMATION_CLASSES.modalBackdropEnter);
    this.modal.classList.add(ANIMATION_CLASSES.modalContentEnter);

    // 等待动画完成
    await Promise.all([
      this.waitForAnimationEnd(this.backdrop),
      this.waitForAnimationEnd(this.modal),
    ]);

    // 清理动画类
    this.backdrop.classList.remove(ANIMATION_CLASSES.modalBackdropEnter);
    this.modal.classList.remove(ANIMATION_CLASSES.modalContentEnter);

    // 启用模态框内容的交互
    this.modal.style.pointerEvents = 'auto';

    // 标记动画结束
    this.isAnimating = false;

    // 触发完成回调
    onComplete?.();
  }

  /**
   * 关闭模态框动画
   * @param options - 动画选项
   */
  async close(options: ModalAnimationOptions = {}): Promise<void> {
    const { onComplete, onStart, skipAnimation = false } = options;

    // 如果正在动画中，等待完成
    if (this.isAnimating) {
      await this.waitForAnimation();
    }

    // 触发开始回调
    onStart?.();

    // 检查是否应该跳过动画
    const shouldSkip = skipAnimation || animationManager.shouldReduceMotion() || 
                       !animationManager.isCategoryEnabled('modal');

    if (shouldSkip) {
      // 直接隐藏，不使用动画
      this.backdrop.classList.remove('show');
      this.backdrop.style.visibility = 'hidden';
      this.backdrop.style.pointerEvents = 'none';
      this.modal.style.pointerEvents = 'none';
      onComplete?.();
      return;
    }

    // 标记动画开始
    this.isAnimating = true;

    // 禁用模态框内容的交互
    this.modal.style.pointerEvents = 'none';
    this.backdrop.style.pointerEvents = 'none';

    // 应用退出动画类
    this.backdrop.classList.add(ANIMATION_CLASSES.modalBackdropExit);
    this.modal.classList.add(ANIMATION_CLASSES.modalContentExit);

    // 等待动画完成
    await Promise.all([
      this.waitForAnimationEnd(this.backdrop),
      this.waitForAnimationEnd(this.modal),
    ]);

    // 清理动画类
    this.backdrop.classList.remove(ANIMATION_CLASSES.modalBackdropExit);
    this.modal.classList.remove(ANIMATION_CLASSES.modalContentExit);

    // 隐藏遮罩层
    this.backdrop.style.visibility = 'hidden';

    // 标记动画结束
    this.isAnimating = false;

    // 触发完成回调
    onComplete?.();
  }

  /**
   * 等待元素动画结束
   * @param element - 目标元素
   */
  private waitForAnimationEnd(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      const handleAnimationEnd = (event: AnimationEvent) => {
        // 确保事件来自目标元素
        if (event.target === element) {
          element.removeEventListener('animationend', handleAnimationEnd);
          resolve();
        }
      };

      element.addEventListener('animationend', handleAnimationEnd);

      // 设置超时保护，防止动画事件未触发
      const timeout = Math.max(MODAL_CONFIG.backdropDuration, MODAL_CONFIG.contentDuration) + 100;
      setTimeout(() => {
        element.removeEventListener('animationend', handleAnimationEnd);
        resolve();
      }, timeout);
    });
  }

  /**
   * 等待当前动画完成
   */
  private waitForAnimation(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isAnimating) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);

      // 设置最大等待时间
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 2000);
    });
  }

  /**
   * 检查是否正在动画中
   */
  isInProgress(): boolean {
    return this.isAnimating;
  }

  /**
   * 立即停止动画
   */
  stopAnimation(): void {
    // 移除所有动画类
    this.backdrop.classList.remove(
      ANIMATION_CLASSES.modalBackdropEnter,
      ANIMATION_CLASSES.modalBackdropExit
    );
    this.modal.classList.remove(
      ANIMATION_CLASSES.modalContentEnter,
      ANIMATION_CLASSES.modalContentExit
    );

    // 重置状态
    this.isAnimating = false;
  }
}

/**
 * 为模态框元素创建动画控制器
 * @param backdrop - 遮罩层元素
 * @param modal - 模态框内容元素
 */
export function createModalAnimationController(
  backdrop: HTMLElement,
  modal: HTMLElement
): ModalAnimationController {
  return new ModalAnimationController(backdrop, modal);
}

/**
 * 初始化所有模态框的动画控制
 * 自动为页面上的模态框添加动画支持
 */
export function initializeModalAnimations(): void {
  // 查找所有模态框
  const backdrops = document.querySelectorAll<HTMLElement>('.modal-backdrop');

  backdrops.forEach((backdrop) => {
    const modal = backdrop.querySelector<HTMLElement>('.modal');
    if (!modal) return;

    // 创建动画控制器
    const controller = createModalAnimationController(backdrop, modal);

    // 将控制器附加到元素上，方便外部访问
    (backdrop as ModalBackdropElement).__modalAnimationController = controller;
  });
}

/**
 * 获取模态框的动画控制器
 * @param backdrop - 遮罩层元素
 */
export function getModalAnimationController(
  backdrop: HTMLElement
): ModalAnimationController | null {
  return (backdrop as ModalBackdropElement).__modalAnimationController || null;
}
