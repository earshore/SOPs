// tests/unit/loggerService.test.ts
// ================================================================
// LoggerService 单元测试 (增强版)
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, LOG_LEVELS } from '@/services/loggerService';
import type { LogLevel } from '@/services/loggerService';

describe('LoggerService', () => {
  beforeEach(() => {
    Logger.clear();
    Logger.setMinLevel(LOG_LEVELS.DEBUG);
    
    // Mock console方法
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ================================================================
  // 基础日志记录
  // ================================================================

  describe('基础日志记录', () => {
    it('应该记录DEBUG级别日志', () => {
      Logger.debug('测试消息', { key: 'value' }, 'TestModule');
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LOG_LEVELS.DEBUG);
      expect(logs[0].message).toBe('测试消息');
      expect(logs[0].module).toBe('TestModule');
      expect(logs[0].data).toEqual({ key: 'value' });
    });

    it('应该记录INFO级别日志', () => {
      Logger.info('信息消息', {}, 'TestModule');
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LOG_LEVELS.INFO);
    });

    it('应该记录WARN级别日志', () => {
      Logger.warn('警告消息', {}, 'TestModule');
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LOG_LEVELS.WARN);
    });

    it('应该记录ERROR级别日志', () => {
      const error = new Error('测试错误');
      Logger.error('错误消息', error, 'TestModule');
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LOG_LEVELS.ERROR);
      expect(logs[0].data.name).toBe('Error');
      expect(logs[0].data.message).toBe('测试错误');
    });

    it('应该记录FATAL级别日志', () => {
      const error = new Error('严重错误');
      Logger.fatal('致命错误', error, 'TestModule');
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LOG_LEVELS.FATAL);
    });

    it('应该包含时间戳', () => {
      const before = Date.now();
      Logger.info('测试消息');
      const after = Date.now();
      
      const logs = Logger.getLogs();
      expect(logs[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(logs[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('应该记录当前URL', () => {
      Logger.info('测试消息');
      
      const logs = Logger.getLogs();
      expect(logs[0].url).toBeDefined();
    });
  });

  // ================================================================
  // 日志级别过滤
  // ================================================================

  describe('日志级别过滤', () => {
    it('应该过滤低于最小级别的日志', () => {
      Logger.setMinLevel(LOG_LEVELS.WARN);
      
      Logger.debug('调试消息');
      Logger.info('信息消息');
      Logger.warn('警告消息');
      Logger.error('错误消息');
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe(LOG_LEVELS.WARN);
      expect(logs[1].level).toBe(LOG_LEVELS.ERROR);
    });

    it('应该支持设置ERROR级别', () => {
      Logger.setMinLevel(LOG_LEVELS.ERROR);
      
      Logger.warn('警告消息');
      Logger.error('错误消息');
      Logger.fatal('致命错误', new Error());
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs.every(log => 
        log.level === LOG_LEVELS.ERROR || log.level === LOG_LEVELS.FATAL
      )).toBe(true);
    });

    it('应该支持设置FATAL级别', () => {
      Logger.setMinLevel(LOG_LEVELS.FATAL);
      
      Logger.error('错误消息', new Error());
      Logger.fatal('致命错误', new Error());
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LOG_LEVELS.FATAL);
    });
  });

  // ================================================================
  // 日志查询
  // ================================================================

  describe('日志查询', () => {
    beforeEach(() => {
      Logger.debug('调试消息');
      Logger.info('信息消息');
      Logger.warn('警告消息');
      Logger.error('错误消息', new Error());
      Logger.fatal('致命错误', new Error());
    });

    it('应该获取所有日志', () => {
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(5);
    });

    it('应该按级别过滤日志', () => {
      const errors = Logger.getLogs(LOG_LEVELS.ERROR);
      expect(errors).toHaveLength(1);
      expect(errors[0].level).toBe(LOG_LEVELS.ERROR);
    });

    it('应该获取错误日志(ERROR和FATAL)', () => {
      const errors = Logger.getErrors();
      expect(errors).toHaveLength(2);
      expect(errors.every(log => 
        log.level === LOG_LEVELS.ERROR || log.level === LOG_LEVELS.FATAL
      )).toBe(true);
    });

    it('应该按时间顺序返回日志', () => {
      const logs = Logger.getLogs();
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i].timestamp).toBeGreaterThanOrEqual(logs[i-1].timestamp);
      }
    });
  });

  // ================================================================
  // 模块日志记录器
  // ================================================================

  describe('模块日志记录器', () => {
    it('应该创建绑定模块的日志记录器', () => {
      const moduleLogger = Logger.createModuleLogger('TestModule');
      
      moduleLogger.info('测试消息');
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].module).toBe('TestModule');
    });

    it('模块日志记录器应该支持所有日志级别', () => {
      const moduleLogger = Logger.createModuleLogger('TestModule');
      
      moduleLogger.debug('调试');
      moduleLogger.info('信息');
      moduleLogger.warn('警告');
      moduleLogger.error('错误', new Error('测试'));
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(4);
      expect(logs.every(log => log.module === 'TestModule')).toBe(true);
    });

    it('应该支持创建多个模块日志记录器', () => {
      const logger1 = Logger.createModuleLogger('Module1');
      const logger2 = Logger.createModuleLogger('Module2');
      
      logger1.info('消息1');
      logger2.info('消息2');
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].module).toBe('Module1');
      expect(logs[1].module).toBe('Module2');
    });

    it('模块日志记录器应该支持传递数据', () => {
      const moduleLogger = Logger.createModuleLogger('TestModule');
      
      moduleLogger.info('测试消息', { userId: 123 });
      
      const logs = Logger.getLogs();
      expect(logs[0].data).toEqual({ userId: 123 });
    });
  });

  // ================================================================
  // 日志导出
  // ================================================================

  describe('日志导出', () => {
    beforeEach(() => {
      Logger.info('测试消息1', { key: 'value1' });
      Logger.error('测试消息2', new Error('错误'));
    });

    it('应该导出为JSON格式', () => {
      const json = Logger.export('json');
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveProperty('timestamp');
      expect(parsed[0]).toHaveProperty('level');
      expect(parsed[0]).toHaveProperty('message');
    });

    it('应该导出为CSV格式', () => {
      const csv = Logger.export('csv');
      
      expect(csv).toContain('时间,级别,模块,消息,URL');
      expect(csv).toContain('INFO');
      expect(csv).toContain('ERROR');
      expect(csv.split('\n').length).toBeGreaterThan(2);
    });

    it('CSV格式应该正确转义特殊字符', () => {
      Logger.clear();
      Logger.info('消息包含"引号"和,逗号');
      
      const csv = Logger.export('csv');
      expect(csv).toContain('"消息包含""引号""和,逗号"');
    });

    it('应该导出空日志', () => {
      Logger.clear();
      
      const json = Logger.export('json');
      expect(JSON.parse(json)).toEqual([]);
      
      const csv = Logger.export('csv');
      expect(csv).toContain('时间,级别,模块,消息,URL');
    });
  });

  // ================================================================
  // 日志清除
  // ================================================================

  describe('日志清除', () => {
    it('应该清除所有日志', () => {
      Logger.info('测试消息1');
      Logger.info('测试消息2');
      
      expect(Logger.getLogs()).toHaveLength(2);
      
      Logger.clear();
      
      expect(Logger.getLogs()).toHaveLength(0);
    });

    it('清除后应该能继续记录日志', () => {
      Logger.info('消息1');
      Logger.clear();
      Logger.info('消息2');
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('消息2');
    });
  });

  // ================================================================
  // 日志容量限制
  // ================================================================

  describe('日志容量限制', () => {
    it('应该限制内存中的日志数量', () => {
      for (let i = 0; i < 150; i++) {
        Logger.info(`消息 ${i}`);
      }
      
      const logs = Logger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
      
      // 应该保留最新的日志
      expect(logs[logs.length - 1].message).toBe('消息 149');
    });

    it('应该在达到容量限制时移除最旧的日志', () => {
      for (let i = 0; i < 110; i++) {
        Logger.info(`消息 ${i}`);
      }
      
      const logs = Logger.getLogs();
      // 最旧的日志应该被移除
      expect(logs[0].message).not.toBe('消息 0');
      expect(logs[0].message).toBe('消息 10');
    });
  });

  // ================================================================
  // 错误对象处理
  // ================================================================

  describe('错误对象处理', () => {
    it('应该正确序列化Error对象', () => {
      const error = new Error('测试错误');
      error.stack = 'Error: 测试错误\n    at test.js:1:1';
      
      Logger.error('错误消息', error);
      
      const logs = Logger.getLogs();
      expect(logs[0].data.name).toBe('Error');
      expect(logs[0].data.message).toBe('测试错误');
      expect(logs[0].data.stack).toBeDefined();
    });

    it('应该处理自定义错误属性', () => {
      const error = new Error('测试错误') as Error & { code: string };
      error.code = 'CUSTOM_ERROR';
      
      Logger.error('错误消息', error);
      
      const logs = Logger.getLogs();
      expect(logs[0].data.code).toBe('CUSTOM_ERROR');
    });

    it('应该处理非Error对象', () => {
      Logger.error('错误消息', { custom: 'data' });
      
      const logs = Logger.getLogs();
      expect(logs[0].data).toEqual({ custom: 'data' });
    });
  });

  // ================================================================
  // 远程日志端点
  // ================================================================

  describe('远程日志端点', () => {
    it('应该设置远程日志端点', () => {
      expect(() => {
        Logger.setRemoteEndpoint('https://logs.example.com/api');
      }).not.toThrow();
    });

    it('应该接受空字符串禁用远程日志', () => {
      expect(() => {
        Logger.setRemoteEndpoint('');
      }).not.toThrow();
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('应该处理空消息', () => {
      Logger.info('');
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('');
    });

    it('应该处理undefined数据', () => {
      Logger.info('测试消息', undefined as any);
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
    });

    it('应该处理null数据', () => {
      Logger.info('测试消息', null as any);
      
      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
    });

    it('应该处理循环引用对象', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      
      expect(() => {
        Logger.info('测试消息', obj);
      }).not.toThrow();
    });

    it('应该处理非常长的消息', () => {
      const longMessage = 'a'.repeat(10000);
      
      expect(() => {
        Logger.info(longMessage);
      }).not.toThrow();
      
      const logs = Logger.getLogs();
      expect(logs[0].message).toBe(longMessage);
    });

    it('应该处理特殊字符', () => {
      const specialMessage = '测试\n换行\t制表符\r回车';
      
      Logger.info(specialMessage);
      
      const logs = Logger.getLogs();
      expect(logs[0].message).toBe(specialMessage);
    });
  });

  // ================================================================
  // Console输出
  // ================================================================

  describe('Console输出', () => {
    it('DEBUG级别应该调用console.debug', () => {
      Logger.debug('测试消息');
      expect(console.debug).toHaveBeenCalled();
    });

    it('INFO级别应该调用console.info', () => {
      Logger.info('测试消息');
      expect(console.info).toHaveBeenCalled();
    });

    it('WARN级别应该调用console.warn', () => {
      Logger.warn('测试消息');
      expect(console.warn).toHaveBeenCalled();
    });

    it('ERROR级别应该调用console.error', () => {
      Logger.error('测试消息', new Error());
      expect(console.error).toHaveBeenCalled();
    });

    it('FATAL级别应该调用console.error', () => {
      Logger.fatal('测试消息', new Error());
      expect(console.error).toHaveBeenCalled();
    });
  });
});
