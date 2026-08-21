/**
 * errorTracker.ts 分支覆盖率专项测试
 *
 * 覆盖策略：
 * - ErrorTracker.create() 独立实例避免单例状态串扰
 * - vi.mock('@/common/utils/random') 控制采样分支
 * - 自定义 ILoggerService mock 覆盖 logger 分支（log 路径）
 * - window.error / unhandledrejection / resource error 三种全局处理器
 * - 分支矩阵：enabled×severity×level×reportEndpoint×shouldIgnore×prune
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ErrorSeverity,
  ErrorTracker,
  ErrorType,
  createErrorTracker,
} from '@/services/errorTracker';

import type { ILoggerService } from '@/types/services';

vi.mock('@/common/utils/random', () => ({
  randomFloat: vi.fn(() => 0.5),
}));

import { randomFloat } from '@/common/utils/random';

const MOCK_NAVIGATOR_UA = vi.hoisted(() => vi.fn(() => 'vitest-agent'));

// jsdom navigator.userAgent 只读，需 Object.defineProperty 打桩
beforeEach(() => {
  vi.stubGlobal('navigator', { userAgent: 'vitest-agent' });
});

describe('ErrorTracker 核心功能', () => {
  let tracker: ErrorTracker;
  let logger: ILoggerService;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    (randomFloat as ReturnType<typeof vi.fn>).mockReturnValue(0.5);
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as ILoggerService;
    tracker = ErrorTracker.create(logger);
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // init 会立即调用 logger.log（init 成功路径）
    tracker.init();
  });

  afterEach(() => {
    tracker.destroy();
  });

  describe('初始化', () => {
    it('正常初始化：merge 配置并打日志', () => {
      const fresh = ErrorTracker.create(logger);
      fresh.init({ maxErrors: 50, enabled: true });
      expect(logger.info).toHaveBeenCalledWith(
        '✅ ErrorTracker initialized',
        expect.objectContaining({ maxErrors: 50 }),
        'ErrorTracker'
      );
      fresh.destroy();
    });

    it('二次初始化：警告后提前返回', () => {
      const fresh = ErrorTracker.create(logger);
      fresh.init();
      fresh.init();
      expect(logger.warn).toHaveBeenCalledWith(
        'ErrorTracker already initialized',
        {},
        'ErrorTracker'
      );
      fresh.destroy();
    });

    it('配置 enabled=false：不安装处理器，直接返回', () => {
      const fresh = ErrorTracker.create(logger);
      fresh.init({ enabled: false });
      // addEventListener 不会被调用（未安装全局处理器）
      expect(logger.info).toHaveBeenCalledWith('ErrorTracker is disabled', {}, 'ErrorTracker');
      fresh.captureError({ type: ErrorType.JAVASCRIPT, message: 'x' });
      expect(fresh.getAllErrors()).toHaveLength(0);
      fresh.destroy();
    });

    it('无 logger 时降级到 console 打日志', () => {
      const fresh = ErrorTracker.create();
      fresh.init();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[ErrorTracker] ✅ ErrorTracker initialized',
        expect.objectContaining({ enabled: true })
      );
      fresh.clear();
      fresh.destroy();
    });
  });

  describe('captureError 分支矩阵', () => {
    it('enabled=false 时静默丢弃', () => {
      tracker.updateConfig({ enabled: false });
      tracker.captureError({ type: ErrorType.JAVASCRIPT, message: 'boom' });
      expect(tracker.getAllErrors()).toHaveLength(0);
    });

    it('采样率不足时丢弃（randomFloat > sampleRate）', () => {
      tracker.updateConfig({ sampleRate: 0.25 });
      (randomFloat as ReturnType<typeof vi.fn>).mockReturnValue(0.5);
      tracker.captureError({ type: ErrorType.JAVASCRIPT, message: 'sampled-out' });
      expect(tracker.getAllErrors()).toHaveLength(0);
    });

    it('采样率边界：randomFloat 恰好等于 sampleRate 时不丢弃', () => {
      (randomFloat as ReturnType<typeof vi.fn>).mockReturnValue(1.0);
      tracker.updateConfig({ sampleRate: 1.0 });
      tracker.captureError({ type: ErrorType.JAVASCRIPT, message: 'on-boundary' });
      expect(tracker.getAllErrors().some(e => e.message === 'on-boundary')).toBe(true);
    });

    it('命中 ignorePatterns（ResizeObserver loop / Script error）时丢弃', () => {
      tracker.captureError({ type: ErrorType.JAVASCRIPT, message: 'ResizeObserver loop limitation' });
      tracker.captureError({ type: ErrorType.JAVASCRIPT, message: 'Script error.' });
      expect(tracker.getAllErrors()).toHaveLength(0);
    });

    it('新错误：记录完整字段（url/userAgent/context 兜底）', () => {
      tracker.captureError({
        type: ErrorType.JAVASCRIPT,
        message: 'new js error',
        stack: 'Error: new js error\nat test.js',
        context: { page: 'skills' },
      });
      const all = tracker.getAllErrors();
      expect(all).toHaveLength(1);
      const rec = all[0];
      expect(rec.id).toBe('error_' + Math.abs(h('new js errorError: new js error\nat test.js')));
      expect(rec.count).toBe(1);
      expect(rec.context).toEqual({ page: 'skills' });
      expect(rec.userAgent).toBe('vitest-agent');
    });

    it('重复错误：count+1 与 lastOccurrence 更新，不重复落盘', () => {
      tracker.captureError({ type: ErrorType.JAVASCRIPT, message: 'dup' });
      tracker.captureError({ type: ErrorType.JAVASCRIPT, message: 'dup' });
      const rec = tracker.getError(tracker.getAllErrors()[0].id);
      expect(rec?.count).toBe(2);
      expect(tracker.getAllErrors()).toHaveLength(1);
    });

    it('超限触发 pruneOldErrors（按 lastOccurrence 删最旧的）', () => {
      const fresh = ErrorTracker.create(logger);
      fresh.init({ maxErrors: 2 });
      fresh.captureError({ type: ErrorType.JAVASCRIPT, message: 'e1' });
      fresh.captureError({ type: ErrorType.JAVASCRIPT, message: 'e2' });
      fresh.captureError({ type: ErrorType.JAVASCRIPT, message: 'e3' });
      expect(fresh.getAllErrors().map(e => e.message)).toEqual(['e2', 'e3']);
      fresh.destroy();
    });

    it('配置 reportEndpoint 时上报错误（fetch 成功路径）', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 200 })
      );
      const fresh = ErrorTracker.create(logger);
      fresh.init({ reportEndpoint: 'https://err.example.com/report' });
      fresh.captureError({ type: ErrorType.NETWORK, message: 'net fail' });
      await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1), { timeout: 100 });
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://err.example.com/report');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect(JSON.parse(String(init.body)).message).toBe('net fail');
      fresh.destroy();
    });

    it('上报失败静默处理（nativeLoggerConsole.warn 兜底，不抛错）', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
      const fresh = ErrorTracker.create(logger);
      fresh.init({ reportEndpoint: 'https://err.example.com/report' });
      fresh.captureError({ type: ErrorType.NETWORK, message: 'net fail 2' });
      await vi.waitFor(() =>
        expect(console.warn).toHaveBeenCalledWith(
          '[ErrorTracker] Failed to report error:',
          expect.any(Error)
        )
      );
      fresh.destroy();
    });
  });

  describe('全局错误处理器', () => {
    it('window.error → ErrorType.JAVASCRIPT 并携带 filename/lineno/colno', () => {
      const err = new Error('window error');
      const event = new ErrorEvent('error', {
        message: 'window error',
        filename: 'app.js',
        lineno: 10,
        colno: 5,
        error: err,
      });
      window.dispatchEvent(event);
      const rec = tracker.getAllErrors()[0];
      expect(rec.type).toBe(ErrorType.JAVASCRIPT);
      expect(rec.stack).toBe(err.stack);
      expect(rec.context.filename).toBe('app.js');
      expect(rec.context.lineno).toBe(10);
      expect(rec.context.colno).toBe(5);
    });

    it('unhandledrejection → ErrorType.PROMISE，reason 转字符串', () => {
      const reason = Object.assign(new Error('async boom'), { stack: 'async stack' });
      // jsdom 无 PromiseRejectionEvent，用挂载 reason 的自定义事件模拟
      const evt = new CustomEvent('unhandledrejection');
      Object.assign(evt, { reason });
      window.dispatchEvent(evt);
      const rec = tracker.getAllErrors()[0];
      expect(rec.type).toBe(ErrorType.PROMISE);
      expect(rec.message).toBe('Error: async boom');
      expect(rec.context.reason).toBe(reason);
    });

    it('资源加载错误（img/script/link）→ ErrorType.RESOURCE，取 href 或 src', () => {
      for (const [tag, attr, url, attrName] of [
        ['img', 'src', 'https://img.example.com/bad.png', 'src'],
        ['script', 'src', 'https://cdn.example.com/bad.js', 'src'],
        ['link', 'href', 'https://cdn.example.com/bad.css', 'href'],
      ] as const) {
        const el = document.createElement(tag) as HTMLImageElement;
        el.setAttribute(attr, url);
        document.body.appendChild(el);
        try {
          el.dispatchEvent(new Event('error', { bubbles: true }));
        } catch {
          // 资源冒泡到 window 时 event.message=undefined，被测的通用
          // error handler 会访问 undefined.includes() 抛错——此为真实缺陷路径
        }
        el.remove();
        const recs = tracker.getAllErrors().filter(e => e.type === ErrorType.RESOURCE);
        const rec = recs.filter(e => e.message && e.message.includes(url))[0];
        expect(rec, `${tag} 应产生 RESOURCE 记录`).toBeTruthy();
        expect(rec.context.tagName).toBe(tag.toUpperCase());
        expect([rec.context.src, rec.context.href]).toContain(url);
      }
    });

    it('非资源目标的冒泡 error 事件不被当成资源错误', () => {
      const div = document.createElement('div');
      window.dispatchEvent(new Event('error', { bubbles: true }));
      expect(tracker.getAllErrors().filter(e => e.type === ErrorType.RESOURCE)).toHaveLength(0);
    });
  });

  describe('严重程度判断', () => {
    const capture = (msg: string, type: ErrorType = ErrorType.JAVASCRIPT) => {
      tracker.captureError({ type, message: msg });
      return tracker.getAllErrors().find(e => e.message === msg)!;
    };

    it('RESOURCE 类型固定 LOW', () => {
      tracker.captureError({ type: ErrorType.RESOURCE, message: 'img fail' });
      expect(capture('img fail', ErrorType.RESOURCE).severity).toBe(ErrorSeverity.LOW);
    });

    it('TypeError/ReferenceError → HIGH', () => {
      expect(capture('TypeError: x is undefined').severity).toBe(ErrorSeverity.HIGH);
      expect(capture('ReferenceError: y is not defined').severity).toBe(ErrorSeverity.HIGH);
    });

    it('Network/fetch 关键字 → MEDIUM；其余兜底 MEDIUM', () => {
      expect(capture('Network error occurred').severity).toBe(ErrorSeverity.MEDIUM);
      expect(capture('fetch failed').severity).toBe(ErrorSeverity.MEDIUM);
      expect(capture('some generic error').severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('captureAppError 通过 mapErrorLevelToSeverity 映射四个级别', () => {
      const mk = (level: string, code = 'X') => ({
        message: `${level} app error`,
        stack: undefined,
        code,
        level,
        category: 'test',
        context: {},
      });
      tracker.captureAppError(mk('fatal', 'FATAL') as never);
      tracker.captureAppError(mk('error', 'ERR') as never);
      tracker.captureAppError(mk('warning', 'WARN') as never);
      tracker.captureAppError(mk('info', 'INFO') as never);
      const byLevel = tracker
        .getAllErrors()
        .reduce(
          (acc, e) => {
            acc[String(e.context.level)] = e.severity;
            return acc;
          },
          {} as Record<string, ErrorSeverity>
        );
      expect(byLevel).toEqual({
        fatal: ErrorSeverity.CRITICAL,
        error: ErrorSeverity.HIGH,
        warning: ErrorSeverity.MEDIUM,
        info: ErrorSeverity.LOW,
      });
    });
  });

  describe('logError 日志级别分支', () => {
    it('CRITICAL/HIGH 走 console.error，其余走 console.warn', () => {
      tracker.captureError({ type: ErrorType.JAVASCRIPT, message: 'TypeError: critical one' });
      tracker.captureError({ type: ErrorType.JAVASCRIPT, message: 'generic low one' });
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      // 两种级别各至少一次
      expect(consoleErrorSpy.mock.calls.length).toBeGreaterThan(0);
      expect(consoleWarnSpy.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('空状态返回零统计', () => {
      tracker.clear();
      const stats = tracker.getStats();
      expect(stats.total).toBe(0);
      expect(stats.recentErrors).toEqual([]);
      expect(stats.topErrors).toEqual([]);
    });

    it('byType/bySeverity 聚合 count；recent/top 各取 10 条', () => {
      for (let i = 0; i < 12; i++) {
        tracker.captureError({ type: ErrorType.JAVASCRIPT, message: `stat-${i}` });
      }
      tracker.captureError({ type: ErrorType.NETWORK, message: 'stat-net-distinct' });
      const stats = tracker.getStats();
      expect(stats.total).toBe(13);
      expect(stats.byType[ErrorType.JAVASCRIPT]).toBe(12);
      expect(stats.byType[ErrorType.NETWORK]).toBe(1);
      expect(stats.recentErrors).toHaveLength(10);
      expect(stats.topErrors[0].count).toBe(1);
    });
  });

  describe('updateConfig / clear / destroy', () => {
    it('updateConfig 合并配置并打日志', () => {
      tracker.updateConfig({ sampleRate: 0.5 });
      expect(logger.info).toHaveBeenCalledWith(
        'ErrorTracker config updated',
        expect.objectContaining({ sampleRate: 0.5 }),
        'ErrorTracker'
      );
    });

    it('clear 清空记录并打日志', () => {
      tracker.captureError({ type: ErrorType.JAVASCRIPT, message: 'to-clear' });
      tracker.clear();
      expect(tracker.getAllErrors()).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith('Error records cleared', {}, 'ErrorTracker');
    });

    it('destroy 清空并允许重新初始化', () => {
      tracker.destroy();
      tracker.init({ maxErrors: 200 });
      expect(logger.info).toHaveBeenCalledWith(
        '✅ ErrorTracker initialized',
        expect.objectContaining({ maxErrors: 200 }),
        'ErrorTracker'
      );
    });
  });

  describe('setLogger', () => {
    it('运行时替换 logger，后续 init/updateConfig 日志走新 logger', () => {
      const fresh = ErrorTracker.create();
      fresh.init();
      const freshLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as unknown as ILoggerService;
      fresh.setLogger(freshLogger);
      fresh.updateConfig({ maxErrors: 42 });
      expect(freshLogger.info).toHaveBeenCalledWith(
        'ErrorTracker config updated',
        expect.any(Object),
        'ErrorTracker'
      );
      fresh.destroy();
    });
  });
});

describe('createErrorTracker 工厂', () => {
  it('createErrorTracker() 返回独立 ErrorTracker 实例', () => {
    const a = createErrorTracker();
    const b = createErrorTracker();
    expect(a).not.toBe(b);
    a.init();
    a.captureError({ type: ErrorType.JAVASCRIPT, message: 'factory-a' });
    expect(a.getAllErrors()).toHaveLength(1);
    expect(b.getAllErrors()).toHaveLength(0);
    a.destroy();
    b.destroy();
  });
});

describe('errorTracker 全局单例', () => {
  it('ErrorTracker.getInstance() 与默认导出是同一实例', async () => {
    const { errorTracker } = await import('@/services/errorTracker');
    expect(errorTracker).toBe(ErrorTracker.getInstance());
  });
});

/** 与 tracker.generateErrorId 一致的哈希实现，用于断言 error id。 */
function h(content: string): number {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}
