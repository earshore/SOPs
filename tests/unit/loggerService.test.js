// tests/unit/loggerService.test.js
// ================================================================
// 🎯 阶段1: 日志服务单元测试
// ================================================================

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Logger, LOG_LEVELS } from '@/services/loggerService.js';

describe('LoggerService', () => {
    beforeEach(() => {
        // 清除日志
        Logger.clear();
        
        // 重置最小日志级别
        Logger.setMinLevel(LOG_LEVELS.DEBUG);
        
        // Mock console方法
        vi.spyOn(console, 'debug').mockImplementation(() => {});
        vi.spyOn(console, 'info').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('基础日志记录', () => {
        test('应该记录DEBUG级别日志', () => {
            Logger.debug('测试消息', { key: 'value' }, 'TestModule');
            
            const logs = Logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe(LOG_LEVELS.DEBUG);
            expect(logs[0].message).toBe('测试消息');
            expect(logs[0].module).toBe('TestModule');
            expect(logs[0].data).toEqual({ key: 'value' });
        });

        test('应该记录INFO级别日志', () => {
            Logger.info('信息消息', {}, 'TestModule');
            
            const logs = Logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe(LOG_LEVELS.INFO);
        });

        test('应该记录WARN级别日志', () => {
            Logger.warn('警告消息', {}, 'TestModule');
            
            const logs = Logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe(LOG_LEVELS.WARN);
        });

        test('应该记录ERROR级别日志', () => {
            const error = new Error('测试错误');
            Logger.error('错误消息', error, 'TestModule');
            
            const logs = Logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe(LOG_LEVELS.ERROR);
            expect(logs[0].data.name).toBe('Error');
            expect(logs[0].data.message).toBe('测试错误');
        });

        test('应该记录FATAL级别日志', () => {
            const error = new Error('严重错误');
            Logger.fatal('致命错误', error, 'TestModule');
            
            const logs = Logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe(LOG_LEVELS.FATAL);
        });
    });

    describe('日志级别过滤', () => {
        test('应该过滤低于最小级别的日志', () => {
            Logger.setMinLevel(LOG_LEVELS.WARN);
            
            Logger.debug('调试消息');
            Logger.info('信息消息');
            Logger.warn('警告消息');
            Logger.error('错误消息');
            
            const logs = Logger.getLogs();
            expect(logs).toHaveLength(2); // 只有WARN和ERROR
            expect(logs[0].level).toBe(LOG_LEVELS.WARN);
            expect(logs[1].level).toBe(LOG_LEVELS.ERROR);
        });
    });

    describe('日志查询', () => {
        beforeEach(() => {
            Logger.debug('调试消息');
            Logger.info('信息消息');
            Logger.warn('警告消息');
            Logger.error('错误消息');
        });

        test('应该获取所有日志', () => {
            const logs = Logger.getLogs();
            expect(logs).toHaveLength(4);
        });

        test('应该按级别过滤日志', () => {
            const errors = Logger.getLogs(LOG_LEVELS.ERROR);
            expect(errors).toHaveLength(1);
            expect(errors[0].level).toBe(LOG_LEVELS.ERROR);
        });

        test('应该获取错误日志', () => {
            const errors = Logger.getErrors();
            expect(errors).toHaveLength(1);
            expect(errors[0].level).toBe(LOG_LEVELS.ERROR);
        });
    });

    describe('模块日志记录器', () => {
        test('应该创建绑定模块的日志记录器', () => {
            const moduleLogger = Logger.createModuleLogger('TestModule');
            
            moduleLogger.info('测试消息');
            
            const logs = Logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].module).toBe('TestModule');
        });

        test('模块日志记录器应该支持所有日志级别', () => {
            const moduleLogger = Logger.createModuleLogger('TestModule');
            
            moduleLogger.debug('调试');
            moduleLogger.info('信息');
            moduleLogger.warn('警告');
            moduleLogger.error('错误', new Error('测试'));
            
            const logs = Logger.getLogs();
            expect(logs).toHaveLength(4);
            expect(logs.every(log => log.module === 'TestModule')).toBe(true);
        });
    });

    describe('日志导出', () => {
        beforeEach(() => {
            Logger.info('测试消息1');
            Logger.error('测试消息2', new Error('错误'));
        });

        test('应该导出为JSON格式', () => {
            const json = Logger.export('json');
            const parsed = JSON.parse(json);
            
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed).toHaveLength(2);
        });

        test('应该导出为CSV格式', () => {
            const csv = Logger.export('csv');
            
            expect(csv).toContain('时间,级别,模块,消息,URL');
            expect(csv).toContain('INFO');
            expect(csv).toContain('ERROR');
        });

        test('不支持的格式应该抛出错误', () => {
            expect(() => Logger.export('xml')).toThrow('不支持的导出格式');
        });
    });

    describe('日志清除', () => {
        test('应该清除所有日志', () => {
            Logger.info('测试消息1');
            Logger.info('测试消息2');
            
            expect(Logger.getLogs()).toHaveLength(2);
            
            Logger.clear();
            
            expect(Logger.getLogs()).toHaveLength(0);
        });
    });

    describe('日志容量限制', () => {
        test('应该限制内存中的日志数量', () => {
            // 记录超过maxLogs的日志
            for (let i = 0; i < 150; i++) {
                Logger.info(`消息 ${i}`);
            }
            
            const logs = Logger.getLogs();
            expect(logs.length).toBeLessThanOrEqual(100);
            
            // 应该保留最新的日志
            expect(logs[logs.length - 1].message).toBe('消息 149');
        });
    });
});
