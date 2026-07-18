// src/services/analyticsService.ts
// ================================================================
// 🎯 P2-11: 用户行为分析服务
// 追踪页面浏览、用户操作和自定义事件
// ================================================================

import { createRandomId, randomFloat } from '@/common/utils/random';
import type { ILoggerService, IStorageService } from '@/types/services';

/**
 * 事件类型
 */
export enum EventType {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  ROUTE_CHANGE = 'route_change',
  CUSTOM = 'custom',
}

/**
 * 用户操作类型
 */
export enum ActionType {
  CLICK = 'click',
  INPUT = 'input',
  SUBMIT = 'submit',
  SCROLL = 'scroll',
  RESIZE = 'resize',
}

/**
 * 分析事件
 */
export interface AnalyticsEvent {
  id: string;
  type: EventType;
  name: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  properties: Record<string, unknown>;
  context: {
    url: string;
    referrer: string;
    userAgent: string;
    screenResolution: string;
    viewport: string;
  };
}

/**
 * 页面浏览事件
 */
export interface PageViewEvent extends AnalyticsEvent {
  type: EventType.PAGE_VIEW;
  properties: {
    path: string;
    title: string;
    duration?: number;
  };
}

/**
 * 用户操作事件
 */
export interface UserActionEvent extends AnalyticsEvent {
  type: EventType.USER_ACTION;
  properties: {
    action: ActionType;
    target: string;
    value?: unknown;
  };
}

/**
 * 会话信息
 */
export interface Session {
  id: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  events: number;
  userId?: string;
}

/**
 * 分析统计
 */
export interface AnalyticsStats {
  totalEvents: number;
  totalPageViews: number;
  totalSessions: number;
  averageSessionDuration: number;
  topPages: Array<{ path: string; views: number }>;
  topActions: Array<{ action: string; count: number }>;
}

/**
 * 分析服务配置
 */
export interface AnalyticsConfig {
  enabled: boolean;
  trackPageViews: boolean;
  trackUserActions: boolean;
  sessionTimeout: number;
  sampleRate: number;
  endpoint?: string;
}

/**
 * 用户行为分析服务
 * 🎯 DI改造：支持依赖注入Logger和Storage
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private config: AnalyticsConfig;
  private events: AnalyticsEvent[];
  private currentSession: Session | null;
  private currentPageView: PageViewEvent | null;
  private pageViewStartTime: number;
  private isInitialized: boolean = false;
  private logger: ILoggerService | null = null;

  constructor(logger?: ILoggerService, _storage?: IStorageService) {
    this.config = {
      enabled: true,
      trackPageViews: true,
      trackUserActions: true,
      sessionTimeout: 30 * 60 * 1000, // 30分钟
      sampleRate: 1.0,
    };
    this.events = [];
    this.currentSession = null;
    this.currentPageView = null;
    this.pageViewStartTime = 0;
    this.logger = logger || null;
    // storage参数保留用于未来扩展
  }

  setLogger(logger: ILoggerService): void {
    this.logger = logger;
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * 记录日志（使用注入的Logger或console）
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    if (this.logger) {
      this.logger[level](message, data, 'Analytics');
    } else {
      console[level](`[Analytics] ${message}`, data);
    }
  }

  private createEvent<TType extends EventType, TProperties extends Record<string, unknown>>(
    type: TType,
    name: string,
    properties: TProperties
  ): AnalyticsEvent & { type: TType; properties: TProperties } {
    return {
      id: this.generateEventId(),
      type,
      name,
      timestamp: Date.now(),
      sessionId: this.currentSession?.id || '',
      userId: this.currentSession?.userId,
      properties,
      context: this.getContext(),
    };
  }

  /**
   * 初始化分析服务
   */
  init(config?: Partial<AnalyticsConfig>): void {
    if (this.isInitialized) {
      this.log('warn', 'AnalyticsService already initialized', {});
      return;
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    if (!this.config.enabled) {
      this.log('info', 'AnalyticsService is disabled', {});
      return;
    }

    // 创建会话
    this.createSession();

    // 设置事件监听
    if (this.config.trackUserActions) {
      this.setupEventListeners();
    }

    // 设置会话超时检查
    this.setupSessionTimeout();

    this.isInitialized = true;
    this.log(
      'info',
      '✅ AnalyticsService initialized',
      this.config as unknown as Record<string, unknown>
    );
  }

  /**
   * 创建新会话
   */
  private createSession(userId?: string): void {
    this.currentSession = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      events: 0,
      userId,
    };

    this.log('debug', 'New session created', { sessionId: this.currentSession.id });
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return createRandomId('session');
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return createRandomId('event');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 点击事件
    document.addEventListener(
      'click',
      e => {
        const target = e.target as HTMLElement;

        // 🔥 排除外部链接和下载按钮，避免拦截 window.open()
        // 检查是否是带有 onclick 的外部链接按钮
        const hasOnclick = target.hasAttribute('onclick') || target.closest('[onclick]');
        const isExternalLink =
          target.closest('a[target="_blank"]') || target.closest('button[onclick*="window.open"]');

        if (hasOnclick || isExternalLink) {
          // 不追踪，让事件正常传播
          return;
        }

        this.trackUserAction({
          action: ActionType.CLICK,
          target: this.getElementSelector(target),
          value: target.textContent?.trim(),
        });
      },
      true
    );

    // 输入事件(节流)
    let inputTimeout: number;
    document.addEventListener(
      'input',
      e => {
        clearTimeout(inputTimeout);
        inputTimeout = window.setTimeout(() => {
          const target = e.target as HTMLInputElement;
          this.trackUserAction({
            action: ActionType.INPUT,
            target: this.getElementSelector(target),
            value: target.type === 'password' ? '[REDACTED]' : target.value?.length,
          });
        }, 1000);
      },
      true
    );

    // 表单提交
    document.addEventListener(
      'submit',
      e => {
        const target = e.target as HTMLFormElement;
        this.trackUserAction({
          action: ActionType.SUBMIT,
          target: this.getElementSelector(target),
        });
      },
      true
    );

    // 滚动事件(节流)
    let scrollTimeout: number;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        this.trackUserAction({
          action: ActionType.SCROLL,
          target: 'window',
          value: {
            scrollY: window.scrollY,
            scrollX: window.scrollX,
          },
        });
      }, 1000);
    });

    // 窗口大小变化
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        this.trackUserAction({
          action: ActionType.RESIZE,
          target: 'window',
          value: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        });
      }, 1000);
    });
  }

  /**
   * 获取元素选择器
   */
  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className) {
      return `.${element.className.split(' ')[0]}`;
    }
    return element.tagName.toLowerCase();
  }

  /**
   * 设置会话超时检查
   */
  private setupSessionTimeout(): void {
    setInterval(() => {
      if (this.currentSession) {
        const now = Date.now();
        const timeSinceLastActivity = now - this.currentSession.lastActivity;

        if (timeSinceLastActivity > this.config.sessionTimeout) {
          this.log('debug', 'Session timeout, creating new session', {});
          this.createSession(this.currentSession.userId);
        }
      }
    }, 60000); // 每分钟检查一次
  }

  /**
   * 追踪页面浏览
   */
  trackPageView(path: string, title: string = document.title): void {
    if (!this.config.enabled || !this.config.trackPageViews) return;
    if (!this.shouldSample()) return;

    // 结束上一个页面浏览
    if (this.currentPageView) {
      const duration = Date.now() - this.pageViewStartTime;
      this.currentPageView.properties.duration = duration;
    }

    // 创建新的页面浏览事件
    const event: PageViewEvent = this.createEvent(EventType.PAGE_VIEW, 'page_view', {
      path,
      title,
    });

    this.currentPageView = event;
    this.pageViewStartTime = Date.now();
    this.recordEvent(event);

    // 更新会话
    if (this.currentSession) {
      this.currentSession.pageViews++;
      this.currentSession.lastActivity = Date.now();
    }

    this.log('debug', 'Page view tracked', { path, title });
  }

  /**
   * 追踪用户操作
   */
  trackUserAction(properties: { action: ActionType; target: string; value?: unknown }): void {
    if (!this.config.enabled || !this.config.trackUserActions) return;
    if (!this.shouldSample()) return;

    const event: UserActionEvent = this.createEvent(
      EventType.USER_ACTION,
      properties.action,
      properties
    );

    this.recordEvent(event);

    // 更新会话
    if (this.currentSession) {
      this.currentSession.lastActivity = Date.now();
    }
  }

  /**
   * 追踪自定义事件
   */
  trackEvent(name: string, properties: Record<string, unknown> = {}): void {
    if (!this.config.enabled) return;
    if (!this.shouldSample()) return;

    const event: AnalyticsEvent = this.createEvent(EventType.CUSTOM, name, properties);

    this.recordEvent(event);

    // 更新会话
    if (this.currentSession) {
      this.currentSession.events++;
      this.currentSession.lastActivity = Date.now();
    }

    this.log('debug', 'Custom event tracked', { name, properties });
  }

  /**
   * 记录事件
   */
  private recordEvent(event: AnalyticsEvent): void {
    this.events.push(event);

    // 限制事件数量
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }

    // 发送到服务器
    if (this.config.endpoint) {
      this.sendEvent(event);
    }
  }

  /**
   * 发送事件到服务器
   */
  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.config.endpoint) return;

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch {
      // 静默失败
    }
  }

  /**
   * 获取上下文信息
   */
  private getContext() {
    return {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  /**
   * 判断是否应该采样
   */
  private shouldSample(): boolean {
    return randomFloat() <= this.config.sampleRate;
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): void {
    if (this.currentSession) {
      this.currentSession.userId = userId;
    }
    this.log('debug', 'User ID set', { userId });
  }

  /**
   * 获取统计信息
   */
  getStats(): AnalyticsStats {
    const pageViews = this.events.filter(e => e.type === EventType.PAGE_VIEW);
    const actions = this.events.filter(e => e.type === EventType.USER_ACTION);

    // 统计页面浏览
    const pageViewCounts = pageViews.reduce(
      (acc, event) => {
        const path = (event as PageViewEvent).properties.path;
        acc[path] = (acc[path] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topPages = Object.entries(pageViewCounts)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // 统计用户操作
    const actionCounts = actions.reduce(
      (acc, event) => {
        const action = (event as UserActionEvent).properties.action;
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 计算平均会话时长
    const averageSessionDuration = this.currentSession
      ? Date.now() - this.currentSession.startTime
      : 0;

    return {
      totalEvents: this.events.length,
      totalPageViews: pageViews.length,
      totalSessions: 1,
      averageSessionDuration,
      topPages,
      topActions,
    };
  }

  /**
   * 获取所有事件
   */
  getAllEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * 清空事件记录
   */
  clear(): void {
    this.events = [];
    this.log('info', 'Analytics events cleared', {});
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('info', 'Analytics config updated', this.config as unknown as Record<string, unknown>);
  }

  /**
   * 销毁分析服务
   */
  destroy(): void {
    this.clear();
    this.currentSession = null;
    this.currentPageView = null;
    this.isInitialized = false;
    this.log('info', 'AnalyticsService destroyed', {});
  }
}

// 创建全局实例（向后兼容）
/** @deprecated 请使用 container.resolveAsync('analytics') 获取AnalyticsService实例 */
export const analyticsService = AnalyticsService.getInstance();

// 默认导出
export default analyticsService;

// ================================================================
// 🎯 DI容器工厂函数
// ================================================================

/**
 * 创建AnalyticsService实例的工厂函数
 * @param logger - LoggerService实例（可选）
 * @param storage - StorageService实例（可选）
 * @returns AnalyticsService实例
 */
export function createAnalyticsService(
  logger?: ILoggerService,
  storage?: IStorageService
): AnalyticsService {
  return new AnalyticsService(logger, storage);
}
