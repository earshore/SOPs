// src/common/components/SkeletonLoader.ts
// ================================================================
// 🎯 骨架屏加载组件
// 提供多种预设骨架屏样式，提升加载体验
// ================================================================

import { ValidationError } from '@/common/errors/AppError';

/**
 * 骨架屏类型
 */
export type SkeletonType =
  | 'text' // 文本行
  | 'title' // 标题
  | 'paragraph' // 段落
  | 'avatar' // 头像
  | 'image' // 图片
  | 'card' // 卡片
  | 'list' // 列表
  | 'table' // 表格
  | 'custom'; // 自定义

/**
 * 骨架屏配置
 */
export interface SkeletonConfig {
  type: SkeletonType;
  count?: number; // 重复次数
  width?: string; // 宽度
  height?: string; // 高度
  animated?: boolean; // 是否启用动画
  className?: string; // 自定义类名
  style?: Partial<CSSStyleDeclaration>; // 自定义样式
}

type SkeletonBuilder = (element: HTMLElement) => HTMLElement;

/**
 * 骨架屏生成器
 */
export class SkeletonLoader {
  private static readonly DEFAULT_CONFIG: Partial<SkeletonConfig> = {
    count: 1,
    animated: true,
  };

  private static readonly BUILDERS: Record<SkeletonType, SkeletonBuilder> = {
    text: element => SkeletonLoader.createTextSkeleton(element),
    title: element => SkeletonLoader.createTitleSkeleton(element),
    paragraph: element => SkeletonLoader.createParagraphSkeleton(element),
    avatar: element => SkeletonLoader.createAvatarSkeleton(element),
    image: element => SkeletonLoader.createImageSkeleton(element),
    card: element => SkeletonLoader.createCardSkeleton(element),
    list: element => SkeletonLoader.createListSkeleton(element),
    table: element => SkeletonLoader.createTableSkeleton(element),
    custom: element => element,
  };

  /**
   * 创建骨架屏元素
   */
  static create(config: SkeletonConfig): HTMLElement {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const container = document.createElement('div');
    container.className = 'skeleton-container';

    for (let i = 0; i < (finalConfig.count || 1); i++) {
      const skeleton = this.createSkeleton(finalConfig);
      container.appendChild(skeleton);
    }

    return container;
  }

  /**
   * 创建单个骨架屏
   */
  private static createSkeleton(config: SkeletonConfig): HTMLElement {
    const element = document.createElement('div');
    element.className = `skeleton skeleton-${config.type}`;

    if (config.animated) {
      element.classList.add('skeleton-animated');
    }

    if (config.className) {
      element.classList.add(config.className);
    }

    // 应用样式
    if (config.width) element.style.width = config.width;
    if (config.height) element.style.height = config.height;
    if (config.style) {
      Object.assign(element.style, config.style);
    }

    return this.BUILDERS[config.type](element);
  }

  /**
   * 创建文本骨架屏
   */
  private static createTextSkeleton(element: HTMLElement): HTMLElement {
    if (!element.style.height) element.style.height = '16px';
    if (!element.style.width) element.style.width = '100%';
    return element;
  }

  /**
   * 创建标题骨架屏
   */
  private static createTitleSkeleton(element: HTMLElement): HTMLElement {
    if (!element.style.height) element.style.height = '24px';
    if (!element.style.width) element.style.width = '60%';
    element.style.marginBottom = '16px';
    return element;
  }

  /**
   * 创建段落骨架屏
   */
  private static createParagraphSkeleton(element: HTMLElement): HTMLElement {
    const lines = [100, 95, 90, 60]; // 不同宽度的行

    lines.forEach((width, index) => {
      const line = document.createElement('div');
      line.className = 'skeleton skeleton-text skeleton-animated';
      line.style.height = '16px';
      line.style.width = `${width}%`;
      line.style.marginBottom = index < lines.length - 1 ? '8px' : '0';
      element.appendChild(line);
    });

    return element;
  }

  /**
   * 创建头像骨架屏
   */
  private static createAvatarSkeleton(element: HTMLElement): HTMLElement {
    const size = element.style.width || element.style.height || '48px';
    element.style.width = size;
    element.style.height = size;
    element.style.borderRadius = '50%';
    return element;
  }

  /**
   * 创建图片骨架屏
   */
  private static createImageSkeleton(element: HTMLElement): HTMLElement {
    if (!element.style.height) element.style.height = '200px';
    if (!element.style.width) element.style.width = '100%';
    element.style.borderRadius = '4px';
    return element;
  }

  /**
   * 创建卡片骨架屏
   */
  private static createCardSkeleton(element: HTMLElement): HTMLElement {
    element.style.padding = '16px';
    element.style.borderRadius = '8px';
    element.style.border = '1px solid #e0e0e0';

    // 图片
    const image = document.createElement('div');
    image.className = 'skeleton skeleton-image skeleton-animated';
    image.style.height = '150px';
    image.style.marginBottom = '12px';
    image.style.borderRadius = '4px';
    element.appendChild(image);

    // 标题
    const title = document.createElement('div');
    title.className = 'skeleton skeleton-title skeleton-animated';
    title.style.height = '20px';
    title.style.width = '70%';
    title.style.marginBottom = '8px';
    element.appendChild(title);

    // 文本行
    for (let i = 0; i < 2; i++) {
      const text = document.createElement('div');
      text.className = 'skeleton skeleton-text skeleton-animated';
      text.style.height = '14px';
      text.style.width = i === 0 ? '100%' : '80%';
      text.style.marginBottom = '6px';
      element.appendChild(text);
    }

    return element;
  }

  /**
   * 创建列表骨架屏
   */
  private static createListSkeleton(element: HTMLElement): HTMLElement {
    for (let i = 0; i < 5; i++) {
      const item = document.createElement('div');
      item.className = 'skeleton-list-item';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.marginBottom = '12px';

      // 头像
      const avatar = document.createElement('div');
      avatar.className = 'skeleton skeleton-avatar skeleton-animated';
      avatar.style.width = '40px';
      avatar.style.height = '40px';
      avatar.style.borderRadius = '50%';
      avatar.style.marginRight = '12px';
      avatar.style.flexShrink = '0';
      item.appendChild(avatar);

      // 文本容器
      const textContainer = document.createElement('div');
      textContainer.style.flex = '1';

      // 标题
      const title = document.createElement('div');
      title.className = 'skeleton skeleton-text skeleton-animated';
      title.style.height = '16px';
      title.style.width = '60%';
      title.style.marginBottom = '6px';
      textContainer.appendChild(title);

      // 描述
      const desc = document.createElement('div');
      desc.className = 'skeleton skeleton-text skeleton-animated';
      desc.style.height = '14px';
      desc.style.width = '40%';
      textContainer.appendChild(desc);

      item.appendChild(textContainer);
      element.appendChild(item);
    }

    return element;
  }

  /**
   * 创建表格骨架屏
   */
  private static createTableSkeleton(element: HTMLElement): HTMLElement {
    // 表头
    const header = document.createElement('div');
    header.className = 'skeleton-table-header';
    header.style.display = 'flex';
    header.style.gap = '12px';
    header.style.marginBottom = '12px';

    for (let i = 0; i < 4; i++) {
      const col = document.createElement('div');
      col.className = 'skeleton skeleton-text skeleton-animated';
      col.style.height = '18px';
      col.style.flex = '1';
      header.appendChild(col);
    }
    element.appendChild(header);

    // 表格行
    for (let i = 0; i < 5; i++) {
      const row = document.createElement('div');
      row.className = 'skeleton-table-row';
      row.style.display = 'flex';
      row.style.gap = '12px';
      row.style.marginBottom = '8px';

      for (let j = 0; j < 4; j++) {
        const col = document.createElement('div');
        col.className = 'skeleton skeleton-text skeleton-animated';
        col.style.height = '16px';
        col.style.flex = '1';
        row.appendChild(col);
      }
      element.appendChild(row);
    }

    return element;
  }

  /**
   * 在目标元素中显示骨架屏
   */
  static show(target: HTMLElement | string, config: SkeletonConfig): HTMLElement {
    const element =
      typeof target === 'string' ? (document.querySelector(target) as HTMLElement) : target;

    if (!element) {
      throw new ValidationError(
        `目标元素未找到: ${target}`,
        'SKELETON_TARGET_NOT_FOUND',
        'target',
        target,
        { module: 'SkeletonLoader', action: 'show' }
      );
    }

    const skeleton = this.create(config);
    skeleton.dataset.skeletonId = `skeleton-${Date.now()}`;
    element.appendChild(skeleton);

    return skeleton;
  }

  /**
   * 隐藏骨架屏
   */
  static hide(skeleton: HTMLElement): void {
    skeleton.remove();
  }

  /**
   * 隐藏目标元素中的所有骨架屏
   */
  static hideAll(target: HTMLElement | string): void {
    const element =
      typeof target === 'string' ? (document.querySelector(target) as HTMLElement) : target;

    if (!element) return;

    const skeletons = element.querySelectorAll('.skeleton-container');
    skeletons.forEach(skeleton => skeleton.remove());
  }
}

/**
 * 便捷函数：显示骨架屏
 */
export function showSkeleton(target: HTMLElement | string, config: SkeletonConfig): HTMLElement {
  return SkeletonLoader.show(target, config);
}

/**
 * 便捷函数：隐藏骨架屏
 */
export function hideSkeleton(skeleton: HTMLElement): void {
  SkeletonLoader.hide(skeleton);
}

/**
 * 便捷函数：隐藏所有骨架屏
 */
export function hideAllSkeletons(target: HTMLElement | string): void {
  SkeletonLoader.hideAll(target);
}
