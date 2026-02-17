// src/services/alertService.ts
// ================================================================
// 🎯 P2-11: 告警和通知服务
// 监控性能指标并触发告警
// ================================================================

import { Logger } from './loggerService';
import eventBus from '@/common/EventBus';

/**
 * 告警级别
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 告警类型
 */
export enum AlertType {
  PERFORMANCE = 'performance',
  ERROR_RATE = 'error_rate',
  MEMORY_LEAK = 'memory_leak',
  CUSTOM = 'custom'
}

/**
 * 告警记录
 */
export interface Alert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: number;
  data: Record<string, any>;
  acknowledged: boolean;
  count: number;
}

/**
 * 告警规则
 */
export interface AlertRule {
  id: string;
  type: AlertType;
  enabled: boolean;
  condition: (data: any) => boolean;
  level: AlertLevel;
  title: string;
  message: (data: any) => string;
  cooldown: number; // 冷却时间(毫秒)
  lastTriggered: number;
}

/**
 * 告警配置
 */
export interface AlertConfig {
  enabled: boolean;
  showToast: boolean;
  showBrowserNotification: boolean;
  maxAlerts: number;
  defaultCooldown: number;
}

/**
 * 告警服务
 */
export class AlertService {
  private static instance: AlertService;
  private config: AlertConfig;
  private rules: Map<string, AlertRule>;
  private alerts: Map<string, Alert>;
  private isInitialized: boolean = false;

  private constructor() {
    this.config = {
      enabled: true,
      showToast: true,
      showBrowserNotification: false,
      maxAlerts: 100,
      defaultCooldown: 60000 // 1分钟
    };
    this.rules = new Map();
    this.alerts = new Map();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  /**
   * 初始化告警服务
   */
  init(config?: Partial<AlertConfig>): void {
    if (this.isInitialized) {
      Logger.warn('AlertService already initialized', {}, 'AlertService');
      return;
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    if (!this.config.enabled) {
      Logger.info('AlertService is disabled', {}, 'AlertService');
      return;
    }

    // 注册默认规则
    this.registerDefaultRules();

    // 请求浏览器通知权限
    if (this.config.showBrowserNotification && 'Notification' in window) {
      Notification.requestPermission();
    }

    this.isInitialized = true;
    Logger.info('✅ AlertService initialized', this.config as unknown as Record<string, unknown>, 'AlertService');
  }

  /**
   * 注册默认告警规则
   */
  private registerDefaultRules(): void {
    // LCP性能告警
    this.registerRule({
      id: 'lcp_threshold',
      type: AlertType.PERFORMANCE,
      enabled: true,
      condition: (data) => data.lcp > 4000,
      level: AlertLevel.WARNING,
      title: 'LCP性能告警',
      message: (data) => `LCP超过阈值: ${(data.lcp / 1000).toFixed(2)}s (阈值: 4s)`,
      cooldown: 300000, // 5分钟
      lastTriggered: 0
    });

    // FID性能告警
    this.registerRule({
      id: 'fid_threshold',
      type: AlertType.PERFORMANCE,
      enabled: true,
      condition: (data) => data.fid > 300,
      level: AlertLevel.WARNING,
      title: 'FID性能告警',
      message: (data) => `FID超过阈值: ${data.fid}ms (阈值: 300ms)`,
      cooldown: 300000,
      lastTriggered: 0
    });

    // CLS性能告警
    this.registerRule({
      id: 'cls_threshold',
      type: AlertType.PERFORMANCE,
      enabled: true,
      condition: (data) => data.cls > 0.25,
      level: AlertLevel.WARNING,
      title: 'CLS性能告警',
      message: (data) => `CLS超过阈值: ${data.cls.toFixed(3)} (阈值: 0.25)`,
      cooldown: 300000,
      lastTriggered: 0
    });

    // 错误率告警
    this.registerRule({
      id: 'error_rate_threshold',
      type: AlertType.ERROR_RATE,
      enabled: true,
      condition: (data) => data.errorRate > 0.01,
      level: AlertLevel.ERROR,
      title: '错误率告警',
      message: (data) => `错误率超过阈值: ${(data.errorRate * 100).toFixed(2)}% (阈值: 1%)`,
      cooldown: 600000, // 10分钟
      lastTriggered: 0
    });

    // 内存泄漏告警
    this.registerRule({
      id: 'memory_leak_threshold',
      type: AlertType.MEMORY_LEAK,
      enabled: true,
      condition: (data) => data.memoryGrowth > 50 * 1024 * 1024,
      level: AlertLevel.CRITICAL,
      title: '内存泄漏告警',
      message: (data) => `内存增长超过阈值: ${(data.memoryGrowth / 1024 / 1024).toFixed(2)}MB (阈值: 50MB)`,
      cooldown: 600000,
      lastTriggered: 0
    });
  }

  /**
   * 注册告警规则
   */
  registerRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    Logger.debug('Alert rule registered', { ruleId: rule.id }, 'AlertService');
  }

  /**
   * 检查告警条件
   */
  check(type: AlertType, data: any): void {
    if (!this.config.enabled) return;

    // 遍历所有规则
    this.rules.forEach(rule => {
      if (rule.type !== type || !rule.enabled) return;

      // 检查冷却时间
      const now = Date.now();
      if (now - rule.lastTriggered < rule.cooldown) return;

      // 检查条件
      if (rule.condition(data)) {
        this.trigger(rule, data);
        rule.lastTriggered = now;
      }
    });
  }

  /**
   * 触发告警
   */
  private trigger(rule: AlertRule, data: any): void {
    const alertId = this.generateAlertId(rule.id);
    const existingAlert = this.alerts.get(alertId);

    if (existingAlert) {
      // 更新现有告警
      existingAlert.count++;
      existingAlert.timestamp = Date.now();
    } else {
      // 创建新告警
      const alert: Alert = {
        id: alertId,
        type: rule.type,
        level: rule.level,
        title: rule.title,
        message: rule.message(data),
        timestamp: Date.now(),
        data,
        acknowledged: false,
        count: 1
      };

      this.alerts.set(alertId, alert);

      // 限制告警数量
      if (this.alerts.size > this.config.maxAlerts) {
        this.pruneOldAlerts();
      }

      // 显示通知
      this.notify(alert);

      // 记录日志
      this.logAlert(alert);

      // 触发事件
      eventBus.emit('alert:triggered', alert);
    }
  }

  /**
   * 显示通知
   */
  private notify(alert: Alert): void {
    // Toast通知
    if (this.config.showToast && typeof window !== 'undefined' && (window as any).showToast) {
      const toastType = this.getToastType(alert.level);
      (window as any).showToast(alert.message, toastType);
    }

    // 浏览器通知
    if (this.config.showBrowserNotification && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.id
      });
    }
  }

  /**
   * 获取Toast类型
   */
  private getToastType(level: AlertLevel): 'info' | 'warning' | 'error' {
    switch (level) {
      case AlertLevel.INFO:
        return 'info';
      case AlertLevel.WARNING:
        return 'warning';
      case AlertLevel.ERROR:
      case AlertLevel.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * 记录告警日志
   */
  private logAlert(alert: Alert): void {
    const logLevel = alert.level === AlertLevel.CRITICAL || alert.level === AlertLevel.ERROR
      ? 'error'
      : 'warn';

    Logger[logLevel](
      `[${alert.type}] ${alert.message}`,
      {
        id: alert.id,
        level: alert.level,
        data: alert.data
      },
      'AlertService'
    );
  }

  /**
   * 确认告警
   */
  acknowledge(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      Logger.debug('Alert acknowledged', { alertId }, 'AlertService');
    }
  }

  /**
   * 确认所有告警
   */
  acknowledgeAll(): void {
    this.alerts.forEach(alert => {
      alert.acknowledged = true;
    });
    Logger.info('All alerts acknowledged', {}, 'AlertService');
  }

  /**
   * 清理旧告警
   */
  private pruneOldAlerts(): void {
    const sortedAlerts = Array.from(this.alerts.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    const toRemove = sortedAlerts.slice(0, sortedAlerts.length - this.config.maxAlerts);
    toRemove.forEach(alert => this.alerts.delete(alert.id));
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(ruleId: string): string {
    return `alert_${ruleId}_${Date.now()}`;
  }

  /**
   * 获取所有告警
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取未确认告警
   */
  getUnacknowledgedAlerts(): Alert[] {
    return this.getAllAlerts().filter(alert => !alert.acknowledged);
  }

  /**
   * 获取告警统计
   */
  getStats(): {
    total: number;
    byLevel: Record<AlertLevel, number>;
    byType: Record<AlertType, number>;
    unacknowledged: number;
  } {
    const alerts = this.getAllAlerts();

    const byLevel = alerts.reduce((acc, alert) => {
      acc[alert.level] = (acc[alert.level] || 0) + 1;
      return acc;
    }, {} as Record<AlertLevel, number>);

    const byType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<AlertType, number>);

    const unacknowledged = alerts.filter(a => !a.acknowledged).length;

    return {
      total: alerts.length,
      byLevel,
      byType,
      unacknowledged
    };
  }

  /**
   * 清空告警
   */
  clear(): void {
    this.alerts.clear();
    Logger.info('All alerts cleared', {}, 'AlertService');
  }

  /**
   * 启用/禁用规则
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      Logger.info(`Alert rule ${enabled ? 'enabled' : 'disabled'}`, { ruleId }, 'AlertService');
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
    Logger.info('AlertService config updated', this.config as unknown as Record<string, unknown>, 'AlertService');
  }

  /**
   * 销毁告警服务
   */
  destroy(): void {
    this.clear();
    this.rules.clear();
    this.isInitialized = false;
    Logger.info('AlertService destroyed', {}, 'AlertService');
  }
}

// 创建全局实例
export const alertService = AlertService.getInstance();

// 默认导出
export default alertService;
