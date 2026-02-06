// tests/unit/performanceService.test.js
// ================================================================
// 🎯 阶段1: 性能监控服务单元测试
// ================================================================

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { performanceService, METRIC_TYPES } from '@/services/performanceService.js';

describe('PerformanceService', () => {
    beforeEach(() => {
        // 清除指标
        performanceService.metrics = [];
    });

    describe('指标记录', () => {
        test('应该记录性能指标', () => {
            performanceService.recordMetric(METRIC_TYPES.PAGE_LOAD, 1500, {
                url: '/test'
            });
            
            expect(performanceService.metrics).toHaveLength(1);
            expect(performanceService.metrics[0].type).toBe(METRIC_TYPES.PAGE_LOAD);
            expect(performanceService.metrics[0].value).toBe(1500);
            expect(performanceService.metrics[0].context.url).toBe('/test');
        });

        test('应该限制内存中的指标数量', () => {
            // 记录超过限制的指标
            for (let i = 0; i < 150; i++) {
                performanceService.recordMetric(METRIC_TYPES.API_CALL, i);
            }
            
            expect(performanceService.metrics.length).toBeLessThanOrEqual(100);
        });
    });

    describe('模块加载测量', () => {
        test('应该测量模块加载时间', async () => {
            const mockLoader = vi.fn(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return { name: 'test-module' };
            });
            
            const result = await performanceService.measureModuleLoad('test-module', mockLoader);
            
            expect(result.name).toBe('test-module');
            expect(mockLoader).toHaveBeenCalled();
            
            const metrics = performanceService.metrics.filter(
                m => m.type === METRIC_TYPES.MODULE_LOAD
            );
            expect(metrics).toHaveLength(1);
            expect(metrics[0].value).toBeGreaterThan(0);
            expect(metrics[0].context.module).toBe('test-module');
        });

        test('应该记录模块加载失败', async () => {
            const mockLoader = vi.fn(async () => {
                throw new Error('加载失败');
            });
            
            await expect(
                performanceService.measureModuleLoad('test-module', mockLoader)
            ).rejects.toThrow('加载失败');
            
            const metrics = performanceService.metrics.filter(
                m => m.type === METRIC_TYPES.MODULE_LOAD
            );
            expect(metrics).toHaveLength(1);
            expect(metrics[0].context.error).toBe('加载失败');
        });
    });

    describe('API调用测量', () => {
        test('应该测量API调用时间', async () => {
            const mockApiCall = vi.fn(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return { data: 'test' };
            });
            
            const result = await performanceService.measureApiCall('test-api', mockApiCall);
            
            expect(result.data).toBe('test');
            expect(mockApiCall).toHaveBeenCalled();
            
            const metrics = performanceService.metrics.filter(
                m => m.type === METRIC_TYPES.API_CALL
            );
            expect(metrics).toHaveLength(1);
            expect(metrics[0].value).toBeGreaterThan(0);
            expect(metrics[0].context.api).toBe('test-api');
            expect(metrics[0].context.success).toBe(true);
        });

        test('应该记录API调用失败', async () => {
            const mockApiCall = vi.fn(async () => {
                throw new Error('API错误');
            });
            
            await expect(
                performanceService.measureApiCall('test-api', mockApiCall)
            ).rejects.toThrow('API错误');
            
            const metrics = performanceService.metrics.filter(
                m => m.type === METRIC_TYPES.API_CALL
            );
            expect(metrics).toHaveLength(1);
            expect(metrics[0].context.success).toBe(false);
            expect(metrics[0].context.error).toBe('API错误');
        });
    });

    describe('用户操作测量', () => {
        test('应该测量用户操作时间', async () => {
            const mockAction = vi.fn(async () => {
                await new Promise(resolve => setTimeout(resolve, 30));
                return 'completed';
            });
            
            const result = await performanceService.measureUserAction('submit-form', mockAction);
            
            expect(result).toBe('completed');
            expect(mockAction).toHaveBeenCalled();
            
            const metrics = performanceService.metrics.filter(
                m => m.type === METRIC_TYPES.USER_ACTION
            );
            expect(metrics).toHaveLength(1);
            expect(metrics[0].context.action).toBe('submit-form');
        });
    });

    describe('性能报告', () => {
        beforeEach(() => {
            // 添加测试数据
            performanceService.recordMetric(METRIC_TYPES.PAGE_LOAD, 1000);
            performanceService.recordMetric(METRIC_TYPES.PAGE_LOAD, 1500);
            performanceService.recordMetric(METRIC_TYPES.PAGE_LOAD, 2000);
            performanceService.recordMetric(METRIC_TYPES.API_CALL, 100);
            performanceService.recordMetric(METRIC_TYPES.API_CALL, 200);
        });

        test('应该生成性能报告', () => {
            const report = performanceService.getReport();
            
            expect(report).toHaveProperty('summary');
            expect(report).toHaveProperty('metrics');
            expect(report).toHaveProperty('timestamp');
        });

        test('报告应该包含统计摘要', () => {
            const report = performanceService.getReport();
            const summary = report.summary;
            
            expect(summary[METRIC_TYPES.PAGE_LOAD]).toBeDefined();
            expect(summary[METRIC_TYPES.PAGE_LOAD].count).toBe(3);
            expect(summary[METRIC_TYPES.PAGE_LOAD].avg).toBe(1500);
            expect(summary[METRIC_TYPES.PAGE_LOAD].min).toBe(1000);
            expect(summary[METRIC_TYPES.PAGE_LOAD].max).toBe(2000);
            
            expect(summary[METRIC_TYPES.API_CALL]).toBeDefined();
            expect(summary[METRIC_TYPES.API_CALL].count).toBe(2);
        });

        test('报告应该包含百分位数', () => {
            const report = performanceService.getReport();
            const summary = report.summary[METRIC_TYPES.PAGE_LOAD];
            
            expect(summary.p50).toBeDefined();
            expect(summary.p95).toBeDefined();
            expect(summary.p99).toBeDefined();
        });
    });
});
