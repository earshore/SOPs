/**
 * 导航动画控制
 * 负责页面过渡、侧边栏、下拉菜单等导航相关的动画控制
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { animationManager } from '../services/animation-manager';
import { ANIMATION_CLASSES } from '../config/animation-config';
import { setSafeHtml } from '../common/utils/security';

type PageTransitionElement = HTMLElement & {
  __pageTransitionController?: PageTransitionController;
};

type SidebarAnimationElement = HTMLElement & {
  __sidebarAnimationController?: SidebarAnimationController;
};

type DropdownAnimationElement = HTMLElement & {
  __dropdownAnimationController?: DropdownAnimationController;
};

/**
 * 页面过渡选项
 */
export interface PageTransitionOptions {
  /** 过渡完成回调 */
  onComplete?: () => void;
  /** 过渡开始回调 */
  onStart?: () => void;
  /** 是否跳过动画 */
  skipAnimation?: boolean;
}

/**
 * 侧边栏动画选项
 */
export interface SidebarAnimationOptions {
  /** 动画完成回调 */
  onComplete?: () => void;
  /** 动画开始回调 */
  onStart?: () => void;
  /** 是否跳过动画 */
  skipAnimation?: boolean;
}

/**
 * 下拉菜单动画选项
 */
export interface DropdownAnimationOptions {
  /** 动画完成回调 */
  onComplete?: () => void;
  /** 动画开始回调 */
  onStart?: () => void;
  /** 是否跳过动画 */
  skipAnimation?: boolean;
}

/**
 * 页面过渡控制器
 * Requirements 8.1: 页面切换淡入淡出
 * Requirements 8.5: 页面过渡在400ms内完成
 */
export class PageTransitionController {
  private container: HTMLElement;
  private isTransitioning: boolean = false;

  /**
   * 创建页面过渡控制器
   * @param container - 页面容器元素
   */
  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * 执行页面过渡
   * @param newContent - 新页面内容（HTML字符串或元素）
   * @param options - 过渡选项
   */
  async transition(
    newContent: string | HTMLElement,
    options: PageTransitionOptions = {}
  ): Promise<void> {
    const { onComplete, onStart, skipAnimation = false } = options;

    // 如果正在过渡中，等待完成
    if (this.isTransitioning) {
      await this.waitForTransition();
    }

    // 触发开始回调
    onStart?.();

    // 检查是否应该跳过动画
    const shouldSkip = skipAnimation || animationManager.shouldReduceMotion() || 
                       !animationManager.isCategoryEnabled('navigation');

    if (shouldSkip) {
      // 直接替换内容，不使用动画
      this.replaceContent(newContent);
      onComplete?.();
      return;
    }

    // 标记过渡开始
    this.isTransitioning = true;

    // 淡出当前页面
    await this.fadeOut();

    // 替换内容
    this.replaceContent(newContent);

    // 淡入新页面
    await this.fadeIn();

    // 标记过渡结束
    this.isTransitioning = false;

    // 触发完成回调
    onComplete?.();
  }

  /**
   * 淡出当前页面
   */
  private async fadeOut(): Promise<void> {
    this.container.classList.add(ANIMATION_CLASSES.pageExit);

    await this.waitForAnimationEnd(this.container);

    this.container.classList.remove(ANIMATION_CLASSES.pageExit);
  }

  /**
   * 淡入新页面
   */
  private async fadeIn(): Promise<void> {
    this.container.classList.add(ANIMATION_CLASSES.pageEnter);

    await this.waitForAnimationEnd(this.container);

    this.container.classList.remove(ANIMATION_CLASSES.pageEnter);
  }

  /**
   * 替换页面内容
   */
  private replaceContent(newContent: string | HTMLElement): void {
    if (typeof newContent === 'string') {
      setSafeHtml(this.container, newContent);
    } else {
      this.container.innerHTML = '';
      this.container.appendChild(newContent);
    }
  }

  /**
   * 等待动画结束
   */
  private waitForAnimationEnd(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      const handleAnimationEnd = (event: AnimationEvent) => {
        if (event.target === element) {
          element.removeEventListener('animationend', handleAnimationEnd);
          resolve();
        }
      };

      element.addEventListener('animationend', handleAnimationEnd);

      // 超时保护
      setTimeout(() => {
        element.removeEventListener('animationend', handleAnimationEnd);
        resolve();
      }, 500);
    });
  }

  /**
   * 等待当前过渡完成
   */
  private waitForTransition(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isTransitioning) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);

      // 最大等待时间
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 2000);
    });
  }

  /**
   * 检查是否正在过渡中
   */
  isInProgress(): boolean {
    return this.isTransitioning;
  }
}

/**
 * 侧边栏动画控制器
 * Requirements 8.2: 侧边栏在300ms内从边缘滑入
 */
export class SidebarAnimationController {
  private sidebar: HTMLElement;
  private isAnimating: boolean = false;
  private isOpen: boolean = false;

  /**
   * 创建侧边栏动画控制器
   * @param sidebar - 侧边栏元素
   */
  constructor(sidebar: HTMLElement) {
    this.sidebar = sidebar;
    // 检查初始状态
    this.isOpen = !sidebar.classList.contains('sidebar-hidden');
  }

  /**
   * 打开侧边栏
   * @param options - 动画选项
   */
  async open(options: SidebarAnimationOptions = {}): Promise<void> {
    const { onComplete, onStart, skipAnimation = false } = options;

    // 如果已经打开，直接返回
    if (this.isOpen) {
      onComplete?.();
      return;
    }

    // 如果正在动画中，等待完成
    if (this.isAnimating) {
      await this.waitForAnimation();
    }

    // 触发开始回调
    onStart?.();

    // 检查是否应该跳过动画
    const shouldSkip = skipAnimation || animationManager.shouldReduceMotion() || 
                       !animationManager.isCategoryEnabled('navigation');

    if (shouldSkip) {
      // 直接显示，不使用动画
      this.sidebar.classList.remove('sidebar-hidden');
      this.sidebar.classList.add('sidebar-visible');
      this.isOpen = true;
      onComplete?.();
      return;
    }

    // 标记动画开始
    this.isAnimating = true;

    // 移除隐藏类，添加进入动画类
    this.sidebar.classList.remove('sidebar-hidden');
    this.sidebar.classList.add(ANIMATION_CLASSES.sidebarEnter);

    // 等待动画完成
    await this.waitForAnimationEnd();

    // 清理动画类，添加可见类
    this.sidebar.classList.remove(ANIMATION_CLASSES.sidebarEnter);
    this.sidebar.classList.add('sidebar-visible');

    // 标记动画结束
    this.isAnimating = false;
    this.isOpen = true;

    // 触发完成回调
    onComplete?.();
  }

  /**
   * 关闭侧边栏
   * @param options - 动画选项
   */
  async close(options: SidebarAnimationOptions = {}): Promise<void> {
    const { onComplete, onStart, skipAnimation = false } = options;

    // 如果已经关闭，直接返回
    if (!this.isOpen) {
      onComplete?.();
      return;
    }

    // 如果正在动画中，等待完成
    if (this.isAnimating) {
      await this.waitForAnimation();
    }

    // 触发开始回调
    onStart?.();

    // 检查是否应该跳过动画
    const shouldSkip = skipAnimation || animationManager.shouldReduceMotion() || 
                       !animationManager.isCategoryEnabled('navigation');

    if (shouldSkip) {
      // 直接隐藏，不使用动画
      this.sidebar.classList.remove('sidebar-visible');
      this.sidebar.classList.add('sidebar-hidden');
      this.isOpen = false;
      onComplete?.();
      return;
    }

    // 标记动画开始
    this.isAnimating = true;

    // 移除可见类，添加退出动画类
    this.sidebar.classList.remove('sidebar-visible');
    this.sidebar.classList.add(ANIMATION_CLASSES.sidebarExit);

    // 等待动画完成
    await this.waitForAnimationEnd();

    // 清理动画类，添加隐藏类
    this.sidebar.classList.remove(ANIMATION_CLASSES.sidebarExit);
    this.sidebar.classList.add('sidebar-hidden');

    // 标记动画结束
    this.isAnimating = false;
    this.isOpen = false;

    // 触发完成回调
    onComplete?.();
  }

  /**
   * 切换侧边栏状态
   * @param options - 动画选项
   */
  async toggle(options: SidebarAnimationOptions = {}): Promise<void> {
    if (this.isOpen) {
      await this.close(options);
    } else {
      await this.open(options);
    }
  }

  /**
   * 等待动画结束
   */
  private waitForAnimationEnd(): Promise<void> {
    return new Promise((resolve) => {
      const handleAnimationEnd = (event: AnimationEvent) => {
        if (event.target === this.sidebar) {
          this.sidebar.removeEventListener('animationend', handleAnimationEnd);
          resolve();
        }
      };

      this.sidebar.addEventListener('animationend', handleAnimationEnd);

      // 超时保护
      setTimeout(() => {
        this.sidebar.removeEventListener('animationend', handleAnimationEnd);
        resolve();
      }, 400);
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

      // 最大等待时间
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 1000);
    });
  }

  /**
   * 检查是否正在动画中
   */
  isInProgress(): boolean {
    return this.isAnimating;
  }

  /**
   * 获取当前状态
   */
  getState(): boolean {
    return this.isOpen;
  }
}

/**
 * 下拉菜单动画控制器
 * Requirements 8.3: 下拉菜单展开时height和opacity同时动画
 */
export class DropdownAnimationController {
  private dropdown: HTMLElement;
  private isAnimating: boolean = false;
  private isOpen: boolean = false;

  /**
   * 创建下拉菜单动画控制器
   * @param dropdown - 下拉菜单元素
   */
  constructor(dropdown: HTMLElement) {
    this.dropdown = dropdown;
    // 检查初始状态
    this.isOpen = dropdown.classList.contains('dropdown-open');
  }

  /**
   * 打开下拉菜单
   * @param options - 动画选项
   */
  async open(options: DropdownAnimationOptions = {}): Promise<void> {
    const { onComplete, onStart, skipAnimation = false } = options;

    // 如果已经打开，直接返回
    if (this.isOpen) {
      onComplete?.();
      return;
    }

    // 如果正在动画中，等待完成
    if (this.isAnimating) {
      await this.waitForAnimation();
    }

    // 触发开始回调
    onStart?.();

    // 检查是否应该跳过动画
    const shouldSkip = skipAnimation || animationManager.shouldReduceMotion() || 
                       !animationManager.isCategoryEnabled('navigation');

    if (shouldSkip) {
      // 直接显示，不使用动画
      this.dropdown.classList.add('dropdown-open');
      this.isOpen = true;
      onComplete?.();
      return;
    }

    // 标记动画开始
    this.isAnimating = true;

    // 添加进入动画类
    this.dropdown.classList.add(ANIMATION_CLASSES.dropdownEnter);
    this.dropdown.classList.add('dropdown-open');

    // 等待动画完成
    await this.waitForAnimationEnd();

    // 清理动画类
    this.dropdown.classList.remove(ANIMATION_CLASSES.dropdownEnter);

    // 标记动画结束
    this.isAnimating = false;
    this.isOpen = true;

    // 触发完成回调
    onComplete?.();
  }

  /**
   * 关闭下拉菜单
   * @param options - 动画选项
   */
  async close(options: DropdownAnimationOptions = {}): Promise<void> {
    const { onComplete, onStart, skipAnimation = false } = options;

    // 如果已经关闭，直接返回
    if (!this.isOpen) {
      onComplete?.();
      return;
    }

    // 如果正在动画中，等待完成
    if (this.isAnimating) {
      await this.waitForAnimation();
    }

    // 触发开始回调
    onStart?.();

    // 检查是否应该跳过动画
    const shouldSkip = skipAnimation || animationManager.shouldReduceMotion() || 
                       !animationManager.isCategoryEnabled('navigation');

    if (shouldSkip) {
      // 直接隐藏，不使用动画
      this.dropdown.classList.remove('dropdown-open');
      this.isOpen = false;
      onComplete?.();
      return;
    }

    // 标记动画开始
    this.isAnimating = true;

    // 添加退出动画类
    this.dropdown.classList.add(ANIMATION_CLASSES.dropdownExit);

    // 等待动画完成
    await this.waitForAnimationEnd();

    // 清理动画类和打开状态
    this.dropdown.classList.remove(ANIMATION_CLASSES.dropdownExit);
    this.dropdown.classList.remove('dropdown-open');

    // 标记动画结束
    this.isAnimating = false;
    this.isOpen = false;

    // 触发完成回调
    onComplete?.();
  }

  /**
   * 切换下拉菜单状态
   * @param options - 动画选项
   */
  async toggle(options: DropdownAnimationOptions = {}): Promise<void> {
    if (this.isOpen) {
      await this.close(options);
    } else {
      await this.open(options);
    }
  }

  /**
   * 等待动画结束
   */
  private waitForAnimationEnd(): Promise<void> {
    return new Promise((resolve) => {
      const handleAnimationEnd = (event: AnimationEvent) => {
        if (event.target === this.dropdown) {
          this.dropdown.removeEventListener('animationend', handleAnimationEnd);
          resolve();
        }
      };

      this.dropdown.addEventListener('animationend', handleAnimationEnd);

      // 超时保护
      setTimeout(() => {
        this.dropdown.removeEventListener('animationend', handleAnimationEnd);
        resolve();
      }, 350);
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

      // 最大等待时间
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 1000);
    });
  }

  /**
   * 检查是否正在动画中
   */
  isInProgress(): boolean {
    return this.isAnimating;
  }

  /**
   * 获取当前状态
   */
  getState(): boolean {
    return this.isOpen;
  }
}

/**
 * 创建页面过渡控制器
 * @param container - 页面容器元素
 */
export function createPageTransitionController(
  container: HTMLElement
): PageTransitionController {
  return new PageTransitionController(container);
}

/**
 * 创建侧边栏动画控制器
 * @param sidebar - 侧边栏元素
 */
export function createSidebarAnimationController(
  sidebar: HTMLElement
): SidebarAnimationController {
  return new SidebarAnimationController(sidebar);
}

/**
 * 创建下拉菜单动画控制器
 * @param dropdown - 下拉菜单元素
 */
export function createDropdownAnimationController(
  dropdown: HTMLElement
): DropdownAnimationController {
  return new DropdownAnimationController(dropdown);
}

/**
 * 初始化所有导航动画
 * 自动为页面上的导航元素添加动画支持
 */
export function initializeNavigationAnimations(): void {
  // 检查动画是否启用
  if (!animationManager.isCategoryEnabled('navigation')) {
    return;
  }

  // 初始化页面容器
  initializePageContainers();

  // 初始化侧边栏
  initializeSidebars();

  // 初始化下拉菜单
  initializeDropdowns();
}

/**
 * 初始化页面容器
 */
function initializePageContainers(): void {
  const containers = document.querySelectorAll<HTMLElement>('.page-container');

  containers.forEach((container) => {
    const controller = createPageTransitionController(container);
    // 将控制器附加到元素上，方便外部访问
    (container as PageTransitionElement).__pageTransitionController = controller;
  });
}

/**
 * 初始化侧边栏
 */
function initializeSidebars(): void {
  const sidebars = document.querySelectorAll<HTMLElement>('.sidebar, .sidebar-right');

  sidebars.forEach((sidebar) => {
    const controller = createSidebarAnimationController(sidebar);
    // 将控制器附加到元素上，方便外部访问
    (sidebar as SidebarAnimationElement).__sidebarAnimationController = controller;

    // 查找触发按钮
    const toggleButton = document.querySelector<HTMLElement>(
      `[data-sidebar-toggle="${sidebar.id}"]`
    );

    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        controller.toggle();
      });
    }
  });
}

/**
 * 初始化下拉菜单
 */
function initializeDropdowns(): void {
  const dropdowns = document.querySelectorAll<HTMLElement>('.dropdown-menu');

  dropdowns.forEach((dropdown) => {
    const controller = createDropdownAnimationController(dropdown);
    // 将控制器附加到元素上，方便外部访问
    (dropdown as DropdownAnimationElement).__dropdownAnimationController = controller;

    // 查找触发按钮
    const trigger = dropdown.previousElementSibling;

    if (trigger instanceof HTMLElement) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        controller.toggle();
      });
    }

    // 点击外部关闭下拉菜单
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;

      if (!dropdown.contains(target) && controller.getState()) {
        controller.close();
      }
    });
  });
}

/**
 * 获取页面过渡控制器
 * @param container - 页面容器元素
 */
export function getPageTransitionController(
  container: HTMLElement
): PageTransitionController | null {
  return (container as PageTransitionElement).__pageTransitionController || null;
}

/**
 * 获取侧边栏动画控制器
 * @param sidebar - 侧边栏元素
 */
export function getSidebarAnimationController(
  sidebar: HTMLElement
): SidebarAnimationController | null {
  return (sidebar as SidebarAnimationElement).__sidebarAnimationController || null;
}

/**
 * 获取下拉菜单动画控制器
 * @param dropdown - 下拉菜单元素
 */
export function getDropdownAnimationController(
  dropdown: HTMLElement
): DropdownAnimationController | null {
  return (dropdown as DropdownAnimationElement).__dropdownAnimationController || null;
}
