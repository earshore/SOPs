import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import eventBus from '@/common/EventBus';
import {
  AlertLevel,
  AlertService,
  AlertType,
  createAlertService,
} from '@/services/alertService';

function createLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

  let logger: ReturnType<typeof createLogger>;
  let service: AlertService;

  beforeEach(() => {
    logger = createLogger();
    service = new AlertService(logger);
    vi.spyOn(Date, 'now').mockReturnValue(1000000);
    (window as Window & { showToast?: unknown }).showToast = vi.fn();
  });

  afterEach(() => {
    service.destroy();
    delete (window as Window & { showToast?: unknown }).showToast;
    vi.restoreAllMocks();
  });

  it('initializes default rules and triggers a matching alert', () => {
    const emit = vi.spyOn(eventBus, 'emit');

    service.init({ showToast: true });
    service.check(AlertType.PERFORMANCE, { lcp: 4500 });

    const alerts = service.getAllAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      id: 'alert_lcp_threshold_1000000',
      level: AlertLevel.WARNING,
      title: 'LCP性能告警',
      acknowledged: false,
      count: 1,
    });
    expect((window as Window & { showToast: ReturnType<typeof vi.fn> }).showToast)
      .toHaveBeenCalledWith(expect.stringContaining('LCP超过阈值'), { type: 'warning' });
    expect(emit).toHaveBeenCalledWith('alert:triggered', alerts[0]);
  });

  it('does not trigger disabled rules or rules still in cooldown', () => {
    service.registerRule({
      id: 'custom_rule',
      type: AlertType.CUSTOM,
      enabled: true,
      condition: () => true,
      level: AlertLevel.INFO,
      title: 'Custom',
      message: () => 'custom message',
      cooldown: 10000,
      lastTriggered: 0,
    });

    service.check(AlertType.CUSTOM, {});
    service.check(AlertType.CUSTOM, {});
    service.toggleRule('custom_rule', false);
    vi.mocked(Date.now).mockReturnValue(1020000);
    service.check(AlertType.CUSTOM, {});

    expect(service.getAllAlerts()).toHaveLength(1);
    expect(logger.info).toHaveBeenCalledWith('Alert rule disabled', { ruleId: 'custom_rule' }, 'AlertService');
  });

  it('acknowledges, summarizes, and clears alerts', () => {
    service.registerRule({
      id: 'custom_rule',
      type: AlertType.CUSTOM,
      enabled: true,
      condition: () => true,
      level: AlertLevel.ERROR,
      title: 'Custom',
      message: () => 'custom message',
      cooldown: 0,
      lastTriggered: 0,
    });

    service.check(AlertType.CUSTOM, { value: 1 });
    const [alert] = service.getAllAlerts();
    expect(alert).toBeDefined();

    service.acknowledge(alert.id);
    expect(service.getUnacknowledgedAlerts()).toHaveLength(0);
    expect(service.getStats()).toMatchObject({
      total: 1,
      unacknowledged: 0,
      byLevel: { [AlertLevel.ERROR]: 1 },
      byType: { [AlertType.CUSTOM]: 1 },
    });

    service.clear();

    expect(service.getAllAlerts()).toEqual([]);
  });

  it('keeps alert count under the configured maximum', () => {
    service.updateConfig({ maxAlerts: 1 });
    service.registerRule({
      id: 'custom_rule',
      type: AlertType.CUSTOM,
      enabled: true,
      condition: () => true,
      level: AlertLevel.INFO,
      title: 'Custom',
      message: (data) => `custom ${String((data as { id: number }).id)}`,
      cooldown: 0,
      lastTriggered: 0,
    });

    service.check(AlertType.CUSTOM, { id: 1 });
    vi.mocked(Date.now).mockReturnValue(1001000);
    service.check(AlertType.CUSTOM, { id: 2 });

    const alerts = service.getAllAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('alert_custom_rule_1001000');
  });

  it('creates independent instances through the factory', () => {
    expect(createAlertService(logger)).toBeInstanceOf(AlertService);
  });
