/**
 * Toast管理器
 * 负责Toast通知的显示、隐藏和堆叠管理
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { animationManager } from './animation-manager';
import {
  TOAST_CONFIG,
  ANIMATION_CLASSES,
} from '../config/animation-config';

/**
 * Toast类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast选项接口
 */
export interface ToastOptions {
  /** Toast类型 */
  type?: ToastType;
  /** 显示时长(ms), 0表示不自动关闭 */
  duration?: number;
  /** 是否可手动关闭 */
  dismissible?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * Toast实例接口
 */
interface ToastInstance {
  /** Toast唯一ID */
  id: string;
  /** Toast DOM元素 */
  element: HTMLElement;
  /** Toast类型 */
  type: ToastType;
  /** 自动关闭定时器 */
  timer: number | null;
  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * Toast管理器类
 * 单例模式，管理所有Toast通知
 */
export class ToastManager {
  private container: HTMLElement | null = null;
  private toasts: Map<string, ToastInstance>;
  private static instance: ToastManager | null = null;
  private idCounter: number = 0;

  /**
   * 初始化Toast管理器
   */
  constructor() {
    this.toasts = new Map();
    this.initContainer();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  /**
   * 显示Toast通知
   * @param message - 消息内容
   * @param options - Toast选项
   * @returns Toast ID
   */
  show(message: string, options: ToastOptions = {}): string {
    const {
      type = 'info',
      duration = TOAST_CONFIG.defaultDuration,
      dismissible = true,
      onClose,
    } = options;

    // 生成唯一ID
    const id = this.generateId();

    // 创建Toast元素
    const element = this.createToastElement(message, type, dismissible, id);

    // 创建Toast实例
    const toast: ToastInstance = {
      id,
      element,
      type,
      timer: null,
      onClose,
    };

    // 添加到容器
    if (this.container) {
      this.container.appendChild(element);
    }

    // 保存实例
    this.toasts.set(id, toast);

    // 更新堆叠位置
    this.updateStackPositions();

    // 应用进入动画
    this.applyEnterAnimation(element);

    // 设置自动关闭
    if (duration > 0) {
      toast.timer = window.setTimeout(() => {
        this.hide(id);
      }, duration);
    }

    return id;
  }

  /**
   * 隐藏Toast通知
   * @param id - Toast ID
   */
  hide(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast) {
      return;
    }

    // 清除自动关闭定时器
    if (toast.timer !== null) {
      clearTimeout(toast.timer);
      toast.timer = null;
    }

    // 应用退出动画
    this.applyExitAnimation(toast.element, () => {
      // 动画完成后移除元素
      toast.element.remove();
      this.toasts.delete(id);

      // 调用关闭回调
      if (toast.onClose) {
        toast.onClose();
      }

      // 更新堆叠位置
      this.updateStackPositions();
    });
  }

  /**
   * 隐藏所有Toast
   */
  hideAll(): void {
    const ids = Array.from(this.toasts.keys());
    ids.forEach(id => this.hide(id));
  }

  /**
   * 显示成功Toast
   * @param message - 消息内容
   * @param duration - 显示时长
   */
  success(message: string, duration?: number): string {
    return this.show(message, { type: 'success', duration });
  }

  /**
   * 显示错误Toast
   * @param message - 消息内容
   * @param duration - 显示时长
   */
  error(message: string, duration?: number): string {
    return this.show(message, { type: 'error', duration });
  }

  /**
   * 显示警告Toast
   * @param message - 消息内容
   * @param duration - 显示时长
   */
  warning(message: string, duration?: number): string {
    return this.show(message, { type: 'warning', duration });
  }

  /**
   * 显示信息Toast
   * @param message - 消息内容
   * @param duration - 显示时长
   */
  info(message: string, duration?: number): string {
    return this.show(message, { type: 'info', duration });
  }

  /**
   * 初始化Toast容器
   */
  private initContainer(): void {
    // 检查是否已存在容器
    let container = document.querySelector('.toast-container') as HTMLElement;

    if (!container) {
      // 创建新容器
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    this.container = container;
  }

  /**
   * 创建Toast元素
   * @param message - 消息内容
   * @param type - Toast类型
   * @param dismissible - 是否可关闭
   * @param id - Toast ID
   */
  private createToastElement(
    message: string,
    type: ToastType,
    dismissible: boolean,
    id: string
  ): HTMLElement {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    toast.setAttribute('data-toast-id', id);

    // 创建消息内容
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    toast.appendChild(messageEl);

    // 添加关闭按钮
    if (dismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', '关闭通知');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => {
        this.hide(id);
      });
      toast.appendChild(closeBtn);
    }

    return toast;
  }

  /**
   * 应用进入动画
   * @param element - Toast元素
   */
  private applyEnterAnimation(element: HTMLElement): void {
    // 检查是否应该减少动画
    if (animationManager.shouldReduceMotion() || !animationManager.isCategoryEnabled('toast')) {
      // 无动画，直接显示
      return;
    }

    // 使用requestAnimationFrame确保动画触发
    requestAnimationFrame(() => {
      element.classList.add(ANIMATION_CLASSES.toastEnter);
    });

    // 动画完成后移除类名
    const handleAnimationEnd = () => {
      element.classList.remove(ANIMATION_CLASSES.toastEnter);
      element.removeEventListener('animationend', handleAnimationEnd);
    };

    element.addEventListener('animationend', handleAnimationEnd);
  }

  /**
   * 应用退出动画
   * @param element - Toast元素
   * @param onComplete - 动画完成回调
   */
  private applyExitAnimation(element: HTMLElement, onComplete: () => void): void {
    // 检查是否应该减少动画
    if (animationManager.shouldReduceMotion() || !animationManager.isCategoryEnabled('toast')) {
      // 无动画，直接完成
      onComplete();
      return;
    }

    // 移除进入动画类（如果还在）
    element.classList.remove(ANIMATION_CLASSES.toastEnter);

    // 添加退出动画类
    element.classList.add(ANIMATION_CLASSES.toastExit);

    // 动画完成后执行回调
    const handleAnimationEnd = () => {
      element.removeEventListener('animationend', handleAnimationEnd);
      onComplete();
    };

    element.addEventListener('animationend', handleAnimationEnd);

    // 设置超时保护，防止动画事件未触发
    setTimeout(() => {
      if (element.parentNode) {
        onComplete();
      }
    }, TOAST_CONFIG.exitDuration + 100);
  }

  /**
   * 更新Toast堆叠位置
   * 为每个Toast设置垂直偏移
   */
  private updateStackPositions(): void {
    const toastArray = Array.from(this.toasts.values());

    toastArray.forEach((toast, index) => {
      // 计算垂直偏移
      const offset = index * TOAST_CONFIG.stackSpacing;

      // 应用变换
      if (animationManager.shouldReduceMotion() || !animationManager.isCategoryEnabled('toast')) {
        // 无动画，直接设置
        toast.element.style.transform = `translateY(${offset}px)`;
      } else {
        // 有动画，添加过渡类
        toast.element.classList.add(ANIMATION_CLASSES.toastStackShift);
        toast.element.style.transform = `translateY(${offset}px)`;
      }
    });
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `toast-${Date.now()}-${this.idCounter++}`;
  }

  /**
   * 获取当前Toast数量
   */
  getToastCount(): number {
    return this.toasts.size;
  }

  /**
   * 检查Toast是否存在
   * @param id - Toast ID
   */
  hasToast(id: string): boolean {
    return this.toasts.has(id);
  }

  /**
   * 销毁管理器
   * 清理所有Toast和资源
   */
  destroy(): void {
    // 隐藏所有Toast
    this.hideAll();

    // 移除容器
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
    ToastManager.instance = null;
  }
}

/**
 * 导出单例实例
 */
export const toastManager = ToastManager.getInstance();
