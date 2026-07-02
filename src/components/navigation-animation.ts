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

type NavigationAnimationOptions =
  | PageTransitionOptions
  | SidebarAnimationOptions
  | DropdownAnimationOptions;

interface NavigationTransitionRunner {
  isComplete: () => boolean;
  isBusy: () => boolean;
  waitForCurrent: () => Promise<void>;
  applyInstant: () => void;
  applyAnimated: () => Promise<void>;
}

function shouldSkipNavigationAnimation(skipAnimation = false): boolean {
  return (
    skipAnimation ||
    animationManager.shouldReduceMotion() ||
    !animationManager.isCategoryEnabled('navigation')
  );
}

async function runNavigationTransition(
  options: NavigationAnimationOptions,
  runner: NavigationTransitionRunner
): Promise<void> {
  const { onComplete, onStart, skipAnimation = false } = options;

  if (runner.isComplete()) {
    onComplete?.();
    return;
  }

  if (runner.isBusy()) {
    await runner.waitForCurrent();
  }

  onStart?.();

  if (shouldSkipNavigationAnimation(skipAnimation)) {
    runner.applyInstant();
    onComplete?.();
    return;
  }

  await runner.applyAnimated();
  onComplete?.();
}

function waitForAnimationEnd(element: HTMLElement, timeoutMs: number): Promise<void> {
  return new Promise(resolve => {
    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.target === element) {
        element.removeEventListener('animationend', handleAnimationEnd);
        resolve();
      }
    };

    element.addEventListener('animationend', handleAnimationEnd);

    setTimeout(() => {
      element.removeEventListener('animationend', handleAnimationEnd);
      resolve();
    }, timeoutMs);
  });
}

function waitForStateIdle(isBusy: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (!isBusy()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 50);

    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, timeoutMs);
  });
}

async function toggleNavigationState<T extends NavigationAnimationOptions>(
  isOpen: boolean,
  options: T,
  open: (options: T) => Promise<void>,
  close: (options: T) => Promise<void>
): Promise<void> {
  if (isOpen) {
    await close(options);
    return;
  }
  await open(options);
}

abstract class ToggleableNavigationAnimation<T extends NavigationAnimationOptions> {
  protected isAnimating: boolean = false;
  protected isOpen: boolean = false;

  abstract open(options?: T): Promise<void>;
  abstract close(options?: T): Promise<void>;

  async toggle(options: T = {} as T): Promise<void> {
    await toggleNavigationState(this.isOpen, options, this.open.bind(this), this.close.bind(this));
  }

  isInProgress(): boolean {
    return this.isAnimating;
  }

  getState(): boolean {
    return this.isOpen;
  }

  protected waitForCurrentAnimation(timeoutMs: number): Promise<void> {
    return waitForStateIdle(() => this.isAnimating, timeoutMs);
  }
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
    if (shouldSkipNavigationAnimation(skipAnimation)) {
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
      this.container.replaceChildren();
      this.container.appendChild(newContent);
    }
  }

  /**
   * 等待动画结束
   */
  private waitForAnimationEnd(element: HTMLElement): Promise<void> {
    return waitForAnimationEnd(element, 500);
  }

  /**
   * 等待当前过渡完成
   */
  private waitForTransition(): Promise<void> {
    return waitForStateIdle(() => this.isTransitioning, 2000);
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
export class SidebarAnimationController extends ToggleableNavigationAnimation<SidebarAnimationOptions> {
  private sidebar: HTMLElement;

  /**
   * 创建侧边栏动画控制器
   * @param sidebar - 侧边栏元素
   */
  constructor(sidebar: HTMLElement) {
    super();
    this.sidebar = sidebar;
    // 检查初始状态
    this.isOpen = !sidebar.classList.contains('sidebar-hidden');
  }

  /**
   * 打开侧边栏
   * @param options - 动画选项
   */
  async open(options: SidebarAnimationOptions = {}): Promise<void> {
    await runNavigationTransition(options, {
      isComplete: () => this.isOpen,
      isBusy: () => this.isAnimating,
      waitForCurrent: () => this.waitForCurrentAnimation(1000),
      applyInstant: () => this.showSidebar(),
      applyAnimated: () => this.animateSidebarOpen(),
    });
  }

  /**
   * 关闭侧边栏
   * @param options - 动画选项
   */
  async close(options: SidebarAnimationOptions = {}): Promise<void> {
    await runNavigationTransition(options, {
      isComplete: () => !this.isOpen,
      isBusy: () => this.isAnimating,
      waitForCurrent: () => this.waitForCurrentAnimation(1000),
      applyInstant: () => this.hideSidebar(),
      applyAnimated: () => this.animateSidebarClose(),
    });
  }

  private showSidebar(): void {
    this.sidebar.classList.remove('sidebar-hidden');
    this.sidebar.classList.add('sidebar-visible');
    this.isOpen = true;
  }

  private hideSidebar(): void {
    this.sidebar.classList.remove('sidebar-visible');
    this.sidebar.classList.add('sidebar-hidden');
    this.isOpen = false;
  }

  private async animateSidebarOpen(): Promise<void> {
    this.isAnimating = true;
    this.sidebar.classList.remove('sidebar-hidden');
    this.sidebar.classList.add(ANIMATION_CLASSES.sidebarEnter);
    await waitForAnimationEnd(this.sidebar, 400);
    this.sidebar.classList.remove(ANIMATION_CLASSES.sidebarEnter);
    this.sidebar.classList.add('sidebar-visible');
    this.isAnimating = false;
    this.isOpen = true;
  }

  private async animateSidebarClose(): Promise<void> {
    this.isAnimating = true;
    this.sidebar.classList.remove('sidebar-visible');
    this.sidebar.classList.add(ANIMATION_CLASSES.sidebarExit);
    await waitForAnimationEnd(this.sidebar, 400);
    this.sidebar.classList.remove(ANIMATION_CLASSES.sidebarExit);
    this.sidebar.classList.add('sidebar-hidden');
    this.isAnimating = false;
    this.isOpen = false;
  }
}

/**
 * 下拉菜单动画控制器
 * Requirements 8.3: 下拉菜单展开时height和opacity同时动画
 */
export class DropdownAnimationController extends ToggleableNavigationAnimation<DropdownAnimationOptions> {
  private dropdown: HTMLElement;

  /**
   * 创建下拉菜单动画控制器
   * @param dropdown - 下拉菜单元素
   */
  constructor(dropdown: HTMLElement) {
    super();
    this.dropdown = dropdown;
    // 检查初始状态
    this.isOpen = dropdown.classList.contains('dropdown-open');
  }

  /**
   * 打开下拉菜单
   * @param options - 动画选项
   */
  async open(options: DropdownAnimationOptions = {}): Promise<void> {
    await runNavigationTransition(options, {
      isComplete: () => this.isOpen,
      isBusy: () => this.isAnimating,
      waitForCurrent: () => this.waitForCurrentAnimation(1000),
      applyInstant: () => this.showDropdown(),
      applyAnimated: () => this.animateDropdownOpen(),
    });
  }

  /**
   * 关闭下拉菜单
   * @param options - 动画选项
   */
  async close(options: DropdownAnimationOptions = {}): Promise<void> {
    await runNavigationTransition(options, {
      isComplete: () => !this.isOpen,
      isBusy: () => this.isAnimating,
      waitForCurrent: () => this.waitForCurrentAnimation(1000),
      applyInstant: () => this.hideDropdown(),
      applyAnimated: () => this.animateDropdownClose(),
    });
  }

  private showDropdown(): void {
    this.dropdown.classList.add('dropdown-open');
    this.isOpen = true;
  }

  private hideDropdown(): void {
    this.dropdown.classList.remove('dropdown-open');
    this.isOpen = false;
  }

  private async animateDropdownOpen(): Promise<void> {
    this.isAnimating = true;
    this.dropdown.classList.add(ANIMATION_CLASSES.dropdownEnter);
    this.dropdown.classList.add('dropdown-open');
    await waitForAnimationEnd(this.dropdown, 350);
    this.dropdown.classList.remove(ANIMATION_CLASSES.dropdownEnter);
    this.isAnimating = false;
    this.isOpen = true;
  }

  private async animateDropdownClose(): Promise<void> {
    this.isAnimating = true;
    this.dropdown.classList.add(ANIMATION_CLASSES.dropdownExit);
    await waitForAnimationEnd(this.dropdown, 350);
    this.dropdown.classList.remove(ANIMATION_CLASSES.dropdownExit);
    this.dropdown.classList.remove('dropdown-open');
    this.isAnimating = false;
    this.isOpen = false;
  }
}

/**
 * 创建页面过渡控制器
 * @param container - 页面容器元素
 */
export function createPageTransitionController(container: HTMLElement): PageTransitionController {
  return new PageTransitionController(container);
}

/**
 * 创建侧边栏动画控制器
 * @param sidebar - 侧边栏元素
 */
export function createSidebarAnimationController(sidebar: HTMLElement): SidebarAnimationController {
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

  containers.forEach(container => {
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

  sidebars.forEach(sidebar => {
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

  dropdowns.forEach(dropdown => {
    const controller = createDropdownAnimationController(dropdown);
    // 将控制器附加到元素上，方便外部访问
    (dropdown as DropdownAnimationElement).__dropdownAnimationController = controller;

    // 查找触发按钮
    const trigger = dropdown.previousElementSibling;

    if (trigger instanceof HTMLElement) {
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        controller.toggle();
      });
    }

    // 点击外部关闭下拉菜单
    document.addEventListener('click', e => {
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
