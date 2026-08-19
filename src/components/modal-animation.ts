/**
 * 模态框动画控制
 * 负责模态框的打开和关闭动画序列
 *
 * Requirements: 4.1, 4.2, 4.3
 */

import { animationManager } from '@/services/animation-manager';

import { ANIMATION_CLASSES, MODAL_CONFIG } from '../config/animation-config';

type ModalBackdropElement = HTMLElement & {
  __modalAnimationController?: ModalAnimationController;
};

const MODAL_SHOW_CLASS = 'show';
const MODAL_INTERACTION_BLOCKED_CLASS = 'modal-interaction-blocked';

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

function shouldSkipModalAnimation(skipAnimation = false): boolean {
  return (
    skipAnimation ||
    animationManager.shouldReduceMotion() ||
    !animationManager.isCategoryEnabled('modal')
  );
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
    await this.runTransition(
      options,
      () => this.showInstantly(),
      () => this.animateOpen()
    );
  }

  /**
   * 关闭模态框动画
   * @param options - 动画选项
   */
  async close(options: ModalAnimationOptions = {}): Promise<void> {
    await this.runTransition(
      options,
      () => this.hideInstantly(),
      () => this.animateClose()
    );
  }

  private async runTransition(
    options: ModalAnimationOptions,
    applyInstant: () => void,
    applyAnimated: () => Promise<void>
  ): Promise<void> {
    const { onComplete, onStart, skipAnimation = false } = options;

    if (this.isAnimating) {
      await this.waitForAnimation();
    }

    onStart?.();

    if (shouldSkipModalAnimation(skipAnimation)) {
      applyInstant();
      onComplete?.();
      return;
    }

    await applyAnimated();
    onComplete?.();
  }

  private showInstantly(): void {
    this.backdrop.classList.add(MODAL_SHOW_CLASS);
    this.modal.classList.remove(MODAL_INTERACTION_BLOCKED_CLASS);
  }

  private hideInstantly(): void {
    this.backdrop.classList.remove(MODAL_SHOW_CLASS);
    this.modal.classList.remove(MODAL_INTERACTION_BLOCKED_CLASS);
  }

  private async animateOpen(): Promise<void> {
    this.isAnimating = true;
    this.backdrop.classList.add(MODAL_SHOW_CLASS);
    this.modal.classList.add(MODAL_INTERACTION_BLOCKED_CLASS);
    this.backdrop.classList.add(ANIMATION_CLASSES.modalBackdropEnter);
    this.modal.classList.add(ANIMATION_CLASSES.modalContentEnter);

    await Promise.all([
      this.waitForAnimationEnd(this.backdrop),
      this.waitForAnimationEnd(this.modal),
    ]);

    this.backdrop.classList.remove(ANIMATION_CLASSES.modalBackdropEnter);
    this.modal.classList.remove(ANIMATION_CLASSES.modalContentEnter);
    this.modal.classList.remove(MODAL_INTERACTION_BLOCKED_CLASS);
    this.isAnimating = false;
  }

  private async animateClose(): Promise<void> {
    this.isAnimating = true;
    this.modal.classList.add(MODAL_INTERACTION_BLOCKED_CLASS);
    this.backdrop.classList.add(ANIMATION_CLASSES.modalBackdropExit);
    this.modal.classList.add(ANIMATION_CLASSES.modalContentExit);

    await Promise.all([
      this.waitForAnimationEnd(this.backdrop),
      this.waitForAnimationEnd(this.modal),
    ]);

    this.backdrop.classList.remove(ANIMATION_CLASSES.modalBackdropExit);
    this.modal.classList.remove(ANIMATION_CLASSES.modalContentExit);
    this.backdrop.classList.remove(MODAL_SHOW_CLASS);
    this.modal.classList.remove(MODAL_INTERACTION_BLOCKED_CLASS);
    this.isAnimating = false;
  }

  /**
   * 等待元素动画结束
   * @param element - 目标元素
   */
  private waitForAnimationEnd(element: HTMLElement): Promise<void> {
    return new Promise(resolve => {
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
    return new Promise(resolve => {
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
      ANIMATION_CLASSES.modalContentExit,
      MODAL_INTERACTION_BLOCKED_CLASS
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

  backdrops.forEach(backdrop => {
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
