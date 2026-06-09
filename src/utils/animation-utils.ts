/**
 * 动画工具函数集合
 * 提供微交互动画系统的核心工具函数
 * 
 * Requirements: 1.3, 5.1, 5.2
 */

import { ANIMATION_CLASSES } from '../config/animation-config';

/**
 * 为元素添加动画类
 * 
 * @param element - 目标元素
 * @param animationClass - 动画类名
 * @param duration - 动画时长（可选，毫秒）
 * @returns Promise，在动画结束时resolve
 * 
 * @example
 * ```typescript
 * await addAnimation(button, 'fade-in', 300);
 * ```
 */
export async function addAnimation(
  element: HTMLElement,
  animationClass: string,
  duration?: number
): Promise<void> {
  return new Promise((resolve) => {
    // 添加动画类
    element.classList.add(animationClass);

    // 如果指定了时长，使用setTimeout
    if (duration !== undefined) {
      setTimeout(() => {
        resolve();
      }, duration);
      return;
    }

    // 否则监听animationend事件
    const handleAnimationEnd = (event: AnimationEvent) => {
      // 确保事件来自目标元素本身，而非子元素
      if (event.target === element) {
        element.removeEventListener('animationend', handleAnimationEnd);
        resolve();
      }
    };

    element.addEventListener('animationend', handleAnimationEnd);
  });
}

/**
 * 移除元素的动画类
 * 
 * @param element - 目标元素
 * @param animationClass - 动画类名
 * 
 * @example
 * ```typescript
 * removeAnimation(button, 'fade-in');
 * ```
 */
export function removeAnimation(element: HTMLElement, animationClass: string): void {
  element.classList.remove(animationClass);
}

/**
 * 交错动画应用
 * 为多个元素按顺序应用动画，每个元素之间有延迟
 * 
 * @param elements - 元素列表
 * @param animationClass - 动画类名
 * @param delay - 每个元素的延迟（毫秒）
 * 
 * @example
 * ```typescript
 * const items = document.querySelectorAll('.list-item');
 * staggerAnimation(Array.from(items), 'fade-in', 50);
 * ```
 */
export function staggerAnimation(
  elements: HTMLElement[],
  animationClass: string,
  delay: number
): void {
  elements.forEach((element, index) => {
    // 使用setTimeout实现延迟
    setTimeout(() => {
      element.classList.add(animationClass);
    }, index * delay);
  });
}

/**
 * 创建涟漪效果
 * 在点击位置创建扩散的圆形波纹动画
 * 
 * @param element - 目标元素（必须有相对定位）
 * @param event - 鼠标点击事件
 * 
 * @example
 * ```typescript
 * button.addEventListener('click', (e) => {
 *   createRipple(button, e);
 * });
 * ```
 */
export function createRipple(element: HTMLElement, event: MouseEvent): void {
  // 确保元素有涟漪容器类
  if (!element.classList.contains(ANIMATION_CLASSES.btnRipple)) {
    element.classList.add(ANIMATION_CLASSES.btnRipple);
  }

  // 获取元素的边界矩形
  const rect = element.getBoundingClientRect();
  
  // 计算涟漪的大小（取宽高中的较大值）
  const size = Math.max(rect.width, rect.height);
  
  // 计算点击位置相对于元素的坐标
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 创建涟漪元素
  const ripple = document.createElement('span');
  ripple.className = ANIMATION_CLASSES.btnRippleEffect;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  // 添加到元素中
  element.appendChild(ripple);

  // 动画结束后移除涟漪元素
  ripple.addEventListener('animationend', () => {
    ripple.remove();
  });
}

/**
 * 检查元素是否在视口中
 * 
 * @param element - 目标元素
 * @param threshold - 可见度阈值（0-1），默认0表示任何部分可见即返回true
 * @returns 元素是否在视口中
 * 
 * @example
 * ```typescript
 * if (isInViewport(element)) {
 *   // 元素在视口中，应用动画
 *   addAnimation(element, 'fade-in');
 * }
 * ```
 */
export function isInViewport(element: HTMLElement, threshold: number = 0): boolean {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  // 计算元素在视口中的可见比例
  const verticalVisible = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
  const horizontalVisible = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);

  if (verticalVisible <= 0 || horizontalVisible <= 0) {
    return false;
  }

  // 如果没有阈值要求，只要有任何部分可见就返回true
  if (threshold === 0) {
    return true;
  }

  // 计算可见面积比例
  const elementArea = rect.width * rect.height;
  const visibleArea = verticalVisible * horizontalVisible;
  const visibleRatio = visibleArea / elementArea;

  return visibleRatio >= threshold;
}

/**
 * 等待动画结束
 * 返回一个Promise，在元素的动画或过渡结束时resolve
 * 
 * @param element - 目标元素
 * @returns Promise，在动画结束时resolve
 * 
 * @example
 * ```typescript
 * element.classList.add('fade-out');
 * await waitForAnimation(element);
 * element.remove(); // 动画完成后移除元素
 * ```
 */
export function waitForAnimation(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.target === element && !resolved) {
        resolved = true;
        element.removeEventListener('animationend', handleAnimationEnd);
        element.removeEventListener('transitionend', handleTransitionEnd);
        resolve();
      }
    };

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target === element && !resolved) {
        resolved = true;
        element.removeEventListener('animationend', handleAnimationEnd);
        element.removeEventListener('transitionend', handleTransitionEnd);
        resolve();
      }
    };

    // 同时监听animation和transition事件
    element.addEventListener('animationend', handleAnimationEnd);
    element.addEventListener('transitionend', handleTransitionEnd);

    // 设置超时保护，防止事件未触发导致Promise永不resolve
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        element.removeEventListener('animationend', handleAnimationEnd);
        element.removeEventListener('transitionend', handleTransitionEnd);
        resolve();
      }
    }, 5000); // 5秒超时
  });
}

/**
 * 批量添加动画类
 * 为多个元素同时添加相同的动画类
 * 
 * @param elements - 元素列表
 * @param animationClass - 动画类名
 * 
 * @example
 * ```typescript
 * const cards = document.querySelectorAll('.card');
 * batchAddAnimation(Array.from(cards), 'fade-in');
 * ```
 */
export function batchAddAnimation(elements: HTMLElement[], animationClass: string): void {
  elements.forEach((element) => {
    element.classList.add(animationClass);
  });
}

/**
 * 批量移除动画类
 * 为多个元素同时移除相同的动画类
 * 
 * @param elements - 元素列表
 * @param animationClass - 动画类名
 * 
 * @example
 * ```typescript
 * const cards = document.querySelectorAll('.card');
 * batchRemoveAnimation(Array.from(cards), 'fade-in');
 * ```
 */
export function batchRemoveAnimation(elements: HTMLElement[], animationClass: string): void {
  elements.forEach((element) => {
    element.classList.remove(animationClass);
  });
}

/**
 * 切换动画类
 * 如果元素有该类则移除，否则添加
 * 
 * @param element - 目标元素
 * @param animationClass - 动画类名
 * @returns 切换后是否包含该类
 * 
 * @example
 * ```typescript
 * const isActive = toggleAnimation(element, 'active');
 * ```
 */
export function toggleAnimation(element: HTMLElement, animationClass: string): boolean {
  element.classList.toggle(animationClass);
  return element.classList.contains(animationClass);
}

/**
 * 安全执行动画
 * 使用try-catch包装动画执行，失败时静默降级
 * 
 * @param callback - 动画执行回调
 * @param onError - 错误处理回调（可选）
 * 
 * @example
 * ```typescript
 * safeAnimate(() => {
 *   element.classList.add('complex-animation');
 * }, (error) => {
 *   handleAnimationError(error);
 * });
 * ```
 */
export function safeAnimate(
  callback: () => void,
  onError?: (error: Error) => void
): void {
  try {
    callback();
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
  }
}

/**
 * 获取元素的计算样式中的动画时长
 * 
 * @param element - 目标元素
 * @returns 动画时长（毫秒）
 * 
 * @example
 * ```typescript
 * const duration = getAnimationDuration(element);
 * element.style.setProperty('--animation-duration', `${duration}ms`);
 * ```
 */
export function getAnimationDuration(element: HTMLElement): number {
  const style = window.getComputedStyle(element);
  const duration = style.animationDuration || style.transitionDuration || '0s';
  
  // 解析时长字符串（支持s和ms单位）
  const match = duration.match(/^([\d.]+)(m?s)$/);
  if (!match || !match[1] || !match[2]) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  return unit === 'ms' ? value : value * 1000;
}

/**
 * 预加载动画
 * 通过添加和立即移除类来触发浏览器预加载动画资源
 * 
 * @param element - 目标元素
 * @param animationClass - 动画类名
 * 
 * @example
 * ```typescript
 * // 在用户可能触发动画前预加载
 * preloadAnimation(button, 'ripple-effect');
 * ```
 */
export function preloadAnimation(element: HTMLElement, animationClass: string): void {
  element.classList.add(animationClass);
  // 使用requestAnimationFrame确保浏览器处理了类的添加
  requestAnimationFrame(() => {
    element.classList.remove(animationClass);
  });
}

/**
 * 为列表项应用交错动画
 * 每个列表项按顺序出现，使用CSS变量控制延迟
 *
 * @param container - 列表容器元素
 * @param options - 可选配置
 * @param options.delay - 每个项的延迟间隔(ms)，默认50
 * @param options.animationClass - 动画类名，默认'list-stagger-item'
 *
 * @example
 * ```typescript
 * const list = document.querySelector('.my-list');
 * applyStaggerAnimation(list);
 * ```
 *
 * Requirements: 5.1, 5.2
 */
export function applyStaggerAnimation(
  container: HTMLElement,
  options?: {
    delay?: number;
    animationClass?: string;
  }
): void {
  // 导入AnimationManager检查是否应该减少动画
  // 注意：这里使用动态导入避免循环依赖
  const shouldSkip = document.documentElement.getAttribute('data-animations') === 'disabled';
  if (shouldSkip) {
    return;
  }

  const delay = options?.delay ?? 50;
  const animationClass = options?.animationClass ?? ANIMATION_CLASSES.listStaggerItem;

  // 获取所有直接子元素
  const items = Array.from(container.children) as HTMLElement[];

  items.forEach((item, index) => {
    // 设置CSS变量控制延迟
    item.style.setProperty('--stagger-index', index.toString());
    item.style.setProperty('--stagger-delay', `${delay}ms`);
    
    // 添加动画类
    item.classList.add(animationClass);
  });
}

/**
 * 使用Intersection Observer监听列表动画
 * 当列表进入视口时自动应用交错动画，优化性能
 *
 * @param options - 可选配置
 * @param options.threshold - 可见度阈值(0-1)，默认0.1
 * @param options.rootMargin - 根边距，默认'0px'
 * @param options.selector - 列表选择器，默认'[data-stagger-list]'
 * @param options.delay - 每个项的延迟间隔(ms)，默认50
 * @returns IntersectionObserver实例，可用于后续清理
 *
 * @example
 * ```typescript
 * // 自动监听所有带data-stagger-list属性的列表
 * const observer = observeListAnimations();
 *
 * // 自定义配置
 * const observer = observeListAnimations({
 *   threshold: 0.2,
 *   selector: '.animated-list',
 *   delay: 100
 * });
 *
 * // 清理
 * observer.disconnect();
 * ```
 *
 * Requirements: 5.5
 */
export function observeListAnimations(options?: {
  threshold?: number;
  rootMargin?: string;
  selector?: string;
  delay?: number;
}): IntersectionObserver {
  const threshold = options?.threshold ?? 0.1;
  const rootMargin = options?.rootMargin ?? '0px';
  const selector = options?.selector ?? '[data-stagger-list]';
  const delay = options?.delay ?? 50;

  // 创建Intersection Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // 当元素进入视口时
        if (entry.isIntersecting) {
          const container = entry.target as HTMLElement;

          // 应用交错动画
          applyStaggerAnimation(container, { delay });

          // 停止观察该元素（动画只执行一次）
          observer.unobserve(container);
        }
      });
    },
    {
      threshold,
      rootMargin,
    }
  );

  // 查找并观察所有匹配的列表
  const lists = document.querySelectorAll(selector);
  lists.forEach((list) => {
    observer.observe(list);
  });

  return observer;
}

/**
 * 为新添加的列表项应用动画
 * 用于动态添加列表项的场景（如虚拟滚动）
 *
 * @param items - 新添加的列表项元素数组
 * @param startIndex - 起始索引，用于计算延迟
 * @param options - 可选配置
 * @param options.delay - 每个项的延迟间隔(ms)，默认50
 * @param options.animationClass - 动画类名，默认'list-stagger-item'
 *
 * @example
 * ```typescript
 * // 虚拟滚动场景：新可见的项目
 * const newItems = [item1, item2, item3];
 * applyStaggerToNewItems(newItems, 10); // 从索引10开始
 * ```
 *
 * Requirements: 5.5
 */
export function applyStaggerToNewItems(
  items: HTMLElement[],
  startIndex: number = 0,
  options?: {
    delay?: number;
    animationClass?: string;
  }
): void {
  const shouldSkip = document.documentElement.getAttribute('data-animations') === 'disabled';
  if (shouldSkip) {
    return;
  }

  const delay = options?.delay ?? 50;
  const animationClass = options?.animationClass ?? ANIMATION_CLASSES.listStaggerItem;

  items.forEach((item, index) => {
    const actualIndex = startIndex + index;

    // 设置CSS变量控制延迟
    item.style.setProperty('--stagger-index', actualIndex.toString());
    item.style.setProperty('--stagger-delay', `${delay}ms`);

    // 添加动画类
    item.classList.add(animationClass);
  });
}

/**
 * 重置列表动画
 * 移除所有动画类和CSS变量，用于重新触发动画
 *
 * @param container - 列表容器元素
 * @param animationClass - 动画类名，默认'list-stagger-item'
 *
 * @example
 * ```typescript
 * const list = document.querySelector('.my-list');
 * resetListAnimation(list);
 * // 稍后重新应用
 * setTimeout(() => applyStaggerAnimation(list), 100);
 * ```
 */
export function resetListAnimation(
  container: HTMLElement,
  animationClass: string = ANIMATION_CLASSES.listStaggerItem
): void {
  const items = Array.from(container.children) as HTMLElement[];

  items.forEach((item) => {
    // 移除动画类
    item.classList.remove(animationClass);

    // 移除CSS变量
    item.style.removeProperty('--stagger-index');
  });
}
