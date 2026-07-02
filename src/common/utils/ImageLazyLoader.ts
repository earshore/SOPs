// src/common/utils/ImageLazyLoader.ts
// ================================================================
// 🎯 图片懒加载工具
// 使用Intersection Observer API实现高性能图片懒加载
// ================================================================

/**
 * 懒加载配置
 */
interface LazyLoadConfig {
  // 根元素（默认为viewport）
  root?: HTMLElement | null;
  // 根边距（提前加载距离）
  rootMargin?: string;
  // 交叉阈值
  threshold?: number | number[];
  // 占位图
  placeholder?: string;
  // 加载失败图
  errorImage?: string;
  // 是否启用淡入动画
  fadeIn?: boolean;
  // 淡入动画时长（毫秒）
  fadeInDuration?: number;
}

/**
 * 图片懒加载管理器
 */
class ImageLazyLoader {
  private observer: IntersectionObserver | null = null;
  private observedImages = new WeakSet<HTMLImageElement>();
  private loadedImages = new WeakSet<HTMLImageElement>();

  private config: Required<LazyLoadConfig> = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
    placeholder:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E',
    errorImage:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23ffebee" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23c62828" font-size="16"%3E加载失败%3C/text%3E%3C/svg%3E',
    fadeIn: true,
    fadeInDuration: 300,
  };

  /**
   * 初始化懒加载器
   */
  initialize(config?: Partial<LazyLoadConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // 检查浏览器支持
    if (!('IntersectionObserver' in window)) {
      this.loadAllImages();
      return;
    }

    // 创建Intersection Observer
    this.observer = new IntersectionObserver(entries => this.handleIntersection(entries), {
      root: this.config.root,
      rootMargin: this.config.rootMargin,
      threshold: this.config.threshold,
    });

    // 观察现有图片
    this.observeExistingImages();

    // 监听DOM变化，自动观察新图片
    this.setupMutationObserver();
  }

  /**
   * 处理交叉事件
   */
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        this.loadImage(img);
      }
    });
  }

  /**
   * 加载图片
   */
  private loadImage(img: HTMLImageElement): void {
    // 已加载，跳过
    if (this.loadedImages.has(img)) {
      return;
    }

    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src && !srcset) {
      return;
    }

    // 设置淡入动画
    if (this.config.fadeIn) {
      img.style.opacity = '0';
      img.style.transition = `opacity ${this.config.fadeInDuration}ms ease-in-out`;
    }

    // 加载成功处理
    const onLoad = () => {
      this.loadedImages.add(img);
      img.classList.add('lazy-loaded');
      img.classList.remove('lazy-loading', 'lazy-error');

      if (this.config.fadeIn) {
        img.style.opacity = '1';
      }

      // 停止观察
      if (this.observer) {
        this.observer.unobserve(img);
      }
    };

    // 加载失败处理
    const onError = () => {
      img.classList.add('lazy-error');
      img.classList.remove('lazy-loading');

      if (this.config.errorImage) {
        img.src = this.config.errorImage;
      }

      // 停止观察
      if (this.observer) {
        this.observer.unobserve(img);
      }
    };

    // 设置加载状态
    img.classList.add('lazy-loading');

    // 绑定事件
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });

    // 开始加载
    if (srcset) {
      img.srcset = srcset;
    }
    if (src) {
      img.src = src;
    }
  }

  /**
   * 观察现有图片
   */
  private observeExistingImages(): void {
    const images = document.querySelectorAll('img[data-src], img[data-srcset]');
    images.forEach(img => this.observe(img as HTMLImageElement));
  }

  /**
   * 设置DOM变化监听
   */
  private setupMutationObserver(): void {
    const mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            // 检查是否为懒加载图片
            if (
              element.tagName === 'IMG' &&
              (element.hasAttribute('data-src') || element.hasAttribute('data-srcset'))
            ) {
              this.observe(element as HTMLImageElement);
            }

            // 检查子元素
            const lazyImages = element.querySelectorAll('img[data-src], img[data-srcset]');
            lazyImages.forEach(img => this.observe(img as HTMLImageElement));
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * 观察单个图片
   */
  observe(img: HTMLImageElement): void {
    if (!this.observer || this.observedImages.has(img)) {
      return;
    }

    // 设置占位图
    if (!img.src && this.config.placeholder) {
      img.src = this.config.placeholder;
    }

    // 添加懒加载类
    img.classList.add('lazy-image');

    // 开始观察
    this.observer.observe(img);
    this.observedImages.add(img);
  }

  /**
   * 立即加载所有图片（降级方案）
   */
  private loadAllImages(): void {
    const images = document.querySelectorAll('img[data-src], img[data-srcset]');
    images.forEach(img => {
      const element = img as HTMLImageElement;
      const src = element.dataset.src;
      const srcset = element.dataset.srcset;

      if (srcset) element.srcset = srcset;
      if (src) element.src = src;
    });
  }

  /**
   * 强制加载指定图片
   */
  forceLoad(img: HTMLImageElement): void {
    this.loadImage(img);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LazyLoadConfig>): void {
    this.config = { ...this.config, ...config };

    // 重新创建observer
    if (this.observer) {
      this.observer.disconnect();
      this.initialize();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): { observed: number; loaded: number } {
    const allImages = document.querySelectorAll('img[data-src], img[data-srcset]');
    const loadedCount = document.querySelectorAll('img.lazy-loaded').length;

    return {
      observed: allImages.length,
      loaded: loadedCount,
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// 导出单例
export const imageLazyLoader = new ImageLazyLoader();

/**
 * 便捷函数：将普通img转换为懒加载img
 */
export function makeLazyImage(img: HTMLImageElement): void {
  if (!img.dataset.src && img.src) {
    img.dataset.src = img.src;
    img.removeAttribute('src');
  }

  imageLazyLoader.observe(img);
}

/**
 * 便捷函数：批量转换懒加载图片
 */
export function makeLazyImages(selector: string = 'img[src]'): void {
  const images = document.querySelectorAll(selector);
  images.forEach(img => makeLazyImage(img as HTMLImageElement));
}
