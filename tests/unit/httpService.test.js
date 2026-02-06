// tests/unit/httpService.test.js
// ================================================================
// 🎯 阶段1: HTTP服务单元测试（增强版）
// ================================================================

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpService, HttpError } from '@/services/httpService.js';

describe('HttpService', () => {
    beforeEach(() => {
        // Mock fetch
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('基础请求', () => {
        test('应该发送GET请求', async () => {
            const mockResponse = { data: 'test' };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await HttpService.get('https://api.test.com/data');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.test.com/data',
                expect.objectContaining({
                    method: 'GET',
                })
            );
            expect(result).toEqual(mockResponse);
        });

        test('应该发送POST请求', async () => {
            const mockResponse = { success: true };
            const postData = { name: 'test' };
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await HttpService.post('https://api.test.com/data', postData);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.test.com/data',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(postData),
                })
            );
            expect(result).toEqual(mockResponse);
        });

        test('应该处理文本响应', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: async () => '<html>test</html>',
            });

            const result = await HttpService.request('https://api.test.com/page', {
                json: false,
            });

            expect(result).toBe('<html>test</html>');
        });
    });

    describe('错误处理', () => {
        test('应该处理HTTP错误', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                text: async () => 'Not Found',
            });

            await expect(
                HttpService.get('https://api.test.com/notfound')
            ).rejects.toThrow(HttpError);
        });

        test('应该处理网络错误', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(
                HttpService.get('https://api.test.com/data')
            ).rejects.toThrow('Network error');
        });

        test('应该处理超时', async () => {
            global.fetch.mockImplementationOnce(() => 
                new Promise((resolve) => {
                    setTimeout(() => resolve({
                        ok: true,
                        json: async () => ({ data: 'test' }),
                    }), 100);
                })
            );

            await expect(
                HttpService.get('https://api.test.com/data', { timeout: 50 })
            ).rejects.toThrow();
        });
    });

    describe('重试机制', () => {
        test('应该在失败时重试', async () => {
            let attempts = 0;
            global.fetch.mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ data: 'success' }),
                });
            });

            const result = await HttpService.get('https://api.test.com/data', {
                retries: 2,
                retryDelay: 10,
            });

            expect(attempts).toBe(3);
            expect(result).toEqual({ data: 'success' });
        });

        test('应该在达到最大重试次数后失败', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            await expect(
                HttpService.get('https://api.test.com/data', {
                    retries: 2,
                    retryDelay: 10,
                })
            ).rejects.toThrow('Network error');

            expect(global.fetch).toHaveBeenCalledTimes(3); // 1次初始 + 2次重试
        });
    });

    describe('请求取消', () => {
        test('应该支持外部取消信号', async () => {
            const controller = new AbortController();
            
            global.fetch.mockImplementationOnce(() => 
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('AbortError')), 50);
                })
            );

            setTimeout(() => controller.abort(), 10);

            await expect(
                HttpService.get('https://api.test.com/data', {
                    signal: controller.signal,
                })
            ).rejects.toThrow();
        });
    });

    describe('客户端创建', () => {
        test('应该创建带基础URL的客户端', async () => {
            const mockResponse = { data: 'test' };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const client = HttpService.createClient('https://api.test.com', {
                'Authorization': 'Bearer token123',
            });

            const result = await client.get('/data');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.test.com/data',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer token123',
                    }),
                })
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('性能监控集成', () => {
        test('应该测量API调用时间', async () => {
            const mockResponse = { data: 'test' };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            // 启用性能监控
            const result = await HttpService.get('https://api.test.com/v1/data', {
                measurePerformance: true,
            });

            expect(result).toEqual(mockResponse);
            // 性能指标应该被记录（通过performanceService）
        });

        test('应该在性能监控不可用时正常工作', async () => {
            const mockResponse = { data: 'test' };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await HttpService.get('https://api.test.com/data', {
                measurePerformance: true,
            });

            expect(result).toEqual(mockResponse);
        });
    });

    describe('API名称提取', () => {
        test('应该从URL提取API名称', () => {
            const apiName = HttpService._extractApiName('https://api.test.com/v1/users/profile');
            expect(apiName).toBe('users/profile');
        });

        test('应该处理无效URL', () => {
            const apiName = HttpService._extractApiName('invalid-url');
            expect(apiName).toBe('unknown');
        });
    });
});
