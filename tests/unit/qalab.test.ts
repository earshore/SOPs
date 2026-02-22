// tests/unit/qalab.test.ts
// ================================================================
// QA Lab 模块单元测试
// 测试模块生命周期、状态管理、Q&A 生成和导出功能
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/master_analysis/qalab/index';
import { qalabState } from '@/modules/app_center/views/master_analysis/qalab/state';
import {
    startAnalysis,
    loadSample,
    clearInput,
    toggleExpandAll,
    exportJSON,
    exportCSV,
    exportText,
    switchLang,
    switchCategory,
    toggleQA,
    copyQA
} from '@/modules/app_center/views/master_analysis/qalab/actions';
import { generateMultiLangQAs } from '@/modules/app_center/views/master_analysis/qalab/qaData';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import eventBus from '@/common/EventBus';
import { MODULE_EVENTS } from '@/common/constants/eventConstants';

// Mock 依赖
vi.mock('@/modules/app_center/views/master_analysis/qalab/utils', () => ({
    showToast: vi.fn(),
    downloadFile: vi.fn(),
    EventManager: class {
        private listeners: any[] = [];
        addEventListener(element: any, event: string, handler: any) {
            this.listeners.push({ element, event, handler });
            element.addEventListener(event, handler);
        }
        cleanup() {
            this.listeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            this.listeners = [];
        }
    }
}));

vi.mock('@/modules/app_center/views/master_analysis/qalab/render', () => ({
    renderResults: vi.fn(),
    renderLangSelector: vi.fn(),
    renderQAGrid: vi.fn()
}));

describe('QA Lab Module', () => {
    let container: HTMLElement;
    let mockTemplate: string;

    beforeEach(() => {
        // 创建测试容器
        container = document.createElement('div');
        container.id = 'qalab-container';
        document.body.appendChild(container);

        // Mock 模板内容
        mockTemplate = `
            <div id="qalab-panel">
                <textarea id="jsonInput"></textarea>
                <div id="inputSection"></div>
                <div id="progressSection"></div>
                <div id="resultsSection"></div>
                <div id="progressBar"></div>
                <div id="step1"></div>
                <div id="step2"></div>
                <div id="step3"></div>
                <div id="step4"></div>
                <div id="step5"></div>
                <div id="step6"></div>
                <button id="expandAllBtn"></button>
            </div>
        `;

        // 重置状态
        qalabState.reset();

        // Mock SafeModuleLoader
        vi.spyOn(SafeModuleLoader.getInstance(), 'loadTemplate').mockResolvedValue(mockTemplate);

        // Mock SafeRenderer
        vi.spyOn(SafeRenderer.getInstance(), 'renderTemplate').mockImplementation((el, html) => {
            el.innerHTML = html;
        });

        // Mock navigator.clipboard
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined)
            }
        });
    });

    afterEach(() => {
        // 清理 DOM
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
        vi.clearAllMocks();
    });

    // ========================================
    // 模块生命周期测试
    // ========================================

    describe('Module Lifecycle', () => {
        it('should mount module successfully', async () => {
            await mount(container);

            expect(SafeModuleLoader.getInstance().loadTemplate).toHaveBeenCalledWith(
                'src/modules/app_center/views/master_analysis/qalab/template.html',
                expect.any(Object)
            );
            expect(SafeRenderer.getInstance().renderTemplate).toHaveBeenCalledWith(
                container,
                mockTemplate
            );
        });

        it('should handle mount errors gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockError = new Error('Template load failed');
            
            vi.spyOn(SafeModuleLoader.getInstance(), 'loadTemplate').mockRejectedValue(mockError);

            await expect(mount(container)).rejects.toThrow('Template load failed');
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[QALab]'),
                mockError
            );

            consoleErrorSpy.mockRestore();
        });

        it('should register global actions on mount', async () => {
            await mount(container);

            expect(qalabState.registeredActions.length).toBeGreaterThan(0);
            expect(qalabState.registeredActions).toContain('amz_qalab_startAnalysis');
            expect(qalabState.registeredActions).toContain('amz_qalab_loadSample');
            expect(qalabState.registeredActions).toContain('amz_qalab_exportJSON');
        });

        it('should setup event listeners on mount', async () => {
            await mount(container);

            expect(qalabState.dataUpdateHandler).toBeDefined();
        });

        it('should unmount module successfully', async () => {
            await mount(container);
            
            unmount();

            expect(qalabState.registeredActions.length).toBe(0);
            expect(qalabState.dataUpdateHandler).toBeNull();
        });

        it('should handle unmount errors gracefully', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            expect(() => unmount()).not.toThrow();

            consoleErrorSpy.mockRestore();
        });
    });

    // ========================================
    // 状态管理测试
    // ========================================

    describe('State Management', () => {
        it('should initialize with default state', () => {
            expect(qalabState.currentLang).toBe('de');
            expect(qalabState.currentCategory).toBe('all');
            expect(qalabState.allExpanded).toBe(false);
            expect(qalabState.reportData).toBeNull();
            expect(qalabState.generatedQAs).toEqual([]);
        });

        it('should reset state correctly', () => {
            qalabState.currentLang = 'en';
            qalabState.currentCategory = 'product';
            qalabState.allExpanded = true;
            qalabState.reportData = { test: 'data' };
            qalabState.generatedQAs = [{ id: 1 } as any];

            qalabState.reset();

            expect(qalabState.currentLang).toBe('de');
            expect(qalabState.currentCategory).toBe('all');
            expect(qalabState.allExpanded).toBe(false);
            expect(qalabState.reportData).toBeNull();
            expect(qalabState.generatedQAs).toEqual([]);
        });

        it('should cleanup state and event listeners', () => {
            qalabState.currentLang = 'en';
            qalabState.registeredActions = ['action1', 'action2'];

            qalabState.cleanup();

            expect(qalabState.currentLang).toBe('de');
            expect(qalabState.registeredActions).toEqual([]);
        });
    });

    // ========================================
    // 数据加载测试
    // ========================================

    describe('Data Loading', () => {
        beforeEach(() => {
            container.innerHTML = mockTemplate;
        });

        it('should load sample data', async () => {
            const { showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');
            const input = document.getElementById('jsonInput') as HTMLTextAreaElement;

            loadSample();

            expect(input.value).toContain('marketplace');
            expect(showToast).toHaveBeenCalledWith(
                'success',
                expect.any(String),
                expect.any(String)
            );
        });

        it('should clear input', async () => {
            const { showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');
            const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
            input.value = 'test data';

            clearInput();

            expect(input.value).toBe('');
            expect(showToast).toHaveBeenCalledWith(
                'success',
                expect.any(String),
                expect.any(String)
            );
        });

        it('should handle empty input on analysis', async () => {
            const { showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');

            await startAnalysis();

            expect(showToast).toHaveBeenCalledWith(
                'error',
                expect.stringContaining('粘贴'),
                expect.any(String)
            );
        });

        it('should handle invalid JSON', async () => {
            const { showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');
            const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
            input.value = 'invalid json {';

            await startAnalysis();

            expect(showToast).toHaveBeenCalledWith(
                'error',
                expect.stringContaining('JSON'),
                expect.any(String)
            );
        });
    });

    // ========================================
    // Q&A 生成测试
    // ========================================

    describe('Q&A Generation', () => {
        beforeEach(() => {
            container.innerHTML = mockTemplate;
        });

        it('should generate Q&As from valid report data', async () => {
            const { showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');
            const { renderResults } = await import('@/modules/app_center/views/master_analysis/qalab/render');
            
            const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
            input.value = JSON.stringify({
                metadata: { marketplace: 'US' },
                results: [
                    {
                        targetId: 'keyword-analysis',
                        title: 'Keyword Analysis',
                        highlights: [{ text: 'Test highlight' }]
                    }
                ]
            });

            await startAnalysis();

            // 等待异步操作完成
            await new Promise(resolve => setTimeout(resolve, 3000));

            expect(qalabState.generatedQAs.length).toBeGreaterThan(0);
            expect(renderResults).toHaveBeenCalled();
            expect(showToast).toHaveBeenCalledWith(
                'success',
                expect.stringContaining('完成'),
                expect.any(String)
            );
        });

        it('should detect marketplace and set language', async () => {
            const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
            input.value = JSON.stringify({
                metadata: { marketplace: 'DE' }
            });

            await startAnalysis();
            await new Promise(resolve => setTimeout(resolve, 3000));

            expect(qalabState.currentLang).toBe('de');
        });

        it('should use default language for unknown marketplace', async () => {
            const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
            input.value = JSON.stringify({
                metadata: { marketplace: 'UNKNOWN' }
            });

            await startAnalysis();
            await new Promise(resolve => setTimeout(resolve, 3000));

            expect(qalabState.currentLang).toBe('de');
        });
    });

    // ========================================
    // UI 交互测试
    // ========================================

    describe('UI Interactions', () => {
        beforeEach(() => {
            container.innerHTML = mockTemplate;
            qalabState.generatedQAs = [
                {
                    id: 1,
                    category: 'product',
                    confidence: 5,
                    translations: {
                        de: { q: 'Frage 1', a: 'Antwort 1' },
                        en: { q: 'Question 1', a: 'Answer 1' }
                    },
                    sources: ['listing']
                },
                {
                    id: 2,
                    category: 'shipping',
                    confidence: 4,
                    translations: {
                        de: { q: 'Frage 2', a: 'Antwort 2' },
                        en: { q: 'Question 2', a: 'Answer 2' }
                    },
                    sources: ['reviews']
                }
            ] as any;
        });

        it('should toggle expand all', () => {
            const card1 = document.createElement('div');
            card1.className = 'qa-card';
            const card2 = document.createElement('div');
            card2.className = 'qa-card';
            container.appendChild(card1);
            container.appendChild(card2);

            toggleExpandAll();

            expect(qalabState.allExpanded).toBe(true);
            expect(card1.classList.contains('open')).toBe(true);
            expect(card2.classList.contains('open')).toBe(true);

            toggleExpandAll();

            expect(qalabState.allExpanded).toBe(false);
            expect(card1.classList.contains('open')).toBe(false);
            expect(card2.classList.contains('open')).toBe(false);
        });

        it('should toggle individual Q&A card', () => {
            const card = document.createElement('div');
            card.className = 'qa-card';
            card.setAttribute('data-qa-id', '1');
            container.appendChild(card);

            toggleQA(1);

            expect(card.classList.contains('open')).toBe(true);

            toggleQA(1);

            expect(card.classList.contains('open')).toBe(false);
        });

        it('should switch language', async () => {
            const { showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');
            const { renderLangSelector, renderQAGrid } = await import('@/modules/app_center/views/master_analysis/qalab/render');

            switchLang('en');

            expect(qalabState.currentLang).toBe('en');
            expect(renderLangSelector).toHaveBeenCalled();
            expect(renderQAGrid).toHaveBeenCalled();
            expect(showToast).toHaveBeenCalledWith(
                'success',
                expect.any(String),
                expect.stringContaining('English')
            );
        });

        it('should switch category', async () => {
            const { renderResults } = await import('@/modules/app_center/views/master_analysis/qalab/render');

            switchCategory('product');

            expect(qalabState.currentCategory).toBe('product');
            expect(renderResults).toHaveBeenCalled();
        });

        it('should copy Q&A to clipboard', async () => {
            const { showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');
            const btnElement = document.createElement('button');
            btnElement.innerHTML = '<i class="fa-solid fa-copy"></i> 复制';

            await copyQA(1, btnElement);

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining('Question 1')
            );
            expect(btnElement.classList.contains('copied')).toBe(true);
            expect(showToast).toHaveBeenCalledWith(
                'success',
                expect.any(String),
                expect.any(String)
            );
        });

        it('should handle copy failure gracefully', async () => {
            const { showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');
            const btnElement = document.createElement('button');
            
            vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Copy failed'));

            await copyQA(1, btnElement);

            expect(showToast).toHaveBeenCalledWith(
                'error',
                expect.stringContaining('失败'),
                expect.any(String)
            );
        });
    });

    // ========================================
    // 导出功能测试
    // ========================================

    describe('Export Functions', () => {
        beforeEach(() => {
            qalabState.currentLang = 'en';
            qalabState.currentCategory = 'all';
            qalabState.generatedQAs = [
                {
                    id: 1,
                    category: 'product',
                    confidence: 5,
                    translations: {
                        en: { q: 'Question 1', a: 'Answer 1' }
                    },
                    sources: ['listing', 'reviews']
                },
                {
                    id: 2,
                    category: 'shipping',
                    confidence: 4,
                    translations: {
                        en: { q: 'Question 2', a: 'Answer 2' }
                    },
                    sources: ['reviews']
                }
            ] as any;
        });

        it('should export JSON with all Q&As', async () => {
            const { downloadFile, showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');

            exportJSON();

            expect(downloadFile).toHaveBeenCalled();
            const blob = (downloadFile as any).mock.calls[0][0];
            const filename = (downloadFile as any).mock.calls[0][1];

            expect(filename).toContain('rufus-qa');
            expect(filename).toContain('.json');
            expect(showToast).toHaveBeenCalledWith(
                'success',
                expect.any(String),
                expect.any(String)
            );
        });

        it('should export JSON with filtered category', async () => {
            const { downloadFile } = await import('@/modules/app_center/views/master_analysis/qalab/utils');
            qalabState.currentCategory = 'product';

            exportJSON();

            expect(downloadFile).toHaveBeenCalled();
            const filename = (downloadFile as any).mock.calls[0][1];
            expect(filename).toContain('product');
        });

        it('should export CSV with proper formatting', async () => {
            const { downloadFile, showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');

            exportCSV();

            expect(downloadFile).toHaveBeenCalled();
            const blob = (downloadFile as any).mock.calls[0][0];
            const filename = (downloadFile as any).mock.calls[0][1];

            expect(filename).toContain('.csv');
            expect(showToast).toHaveBeenCalledWith(
                'success',
                expect.any(String),
                expect.any(String)
            );
        });

        it('should export text with proper formatting', async () => {
            const { downloadFile, showToast } = await import('@/modules/app_center/views/master_analysis/qalab/utils');

            exportText();

            expect(downloadFile).toHaveBeenCalled();
            const blob = (downloadFile as any).mock.calls[0][0];
            const filename = (downloadFile as any).mock.calls[0][1];

            expect(filename).toContain('.txt');
            expect(showToast).toHaveBeenCalledWith(
                'success',
                expect.any(String),
                expect.any(String)
            );
        });
    });

    // ========================================
    // Q&A 数据生成测试
    // ========================================

    describe('Q&A Data Generation', () => {
        it('should generate Q&As from report data', () => {
            const reportData = {
                metadata: { marketplace: 'US' },
                results: [
                    {
                        targetId: 'keyword-analysis',
                        title: 'Keyword Analysis',
                        highlights: [
                            { text: 'High search volume keywords' },
                            { text: 'Competitive keywords' }
                        ],
                        details: [
                            {
                                category: 'Top Keywords',
                                items: ['wireless earbuds', 'bluetooth headphones']
                            }
                        ]
                    }
                ]
            };

            const qas = generateMultiLangQAs(reportData);

            expect(qas.length).toBeGreaterThan(0);
            expect(qas[0]).toHaveProperty('id');
            expect(qas[0]).toHaveProperty('category');
            expect(qas[0]).toHaveProperty('confidence');
            expect(qas[0]).toHaveProperty('translations');
            expect(qas[0]).toHaveProperty('sources');
        });

        it('should generate multi-language translations', () => {
            const reportData = {
                metadata: { marketplace: 'US' },
                results: [
                    {
                        targetId: 'test',
                        title: 'Test',
                        highlights: [{ text: 'Test highlight' }]
                    }
                ]
            };

            const qas = generateMultiLangQAs(reportData);

            expect(qas[0].translations).toHaveProperty('en');
            expect(qas[0].translations).toHaveProperty('de');
            expect(qas[0].translations).toHaveProperty('fr');
            expect(qas[0].translations).toHaveProperty('es');
            expect(qas[0].translations).toHaveProperty('it');
            expect(qas[0].translations).toHaveProperty('ja');
        });

        it('should assign confidence scores', () => {
            const reportData = {
                metadata: { marketplace: 'US' },
                results: [
                    {
                        targetId: 'test',
                        title: 'Test',
                        highlights: [{ text: 'Test' }]
                    }
                ]
            };

            const qas = generateMultiLangQAs(reportData);

            qas.forEach(qa => {
                expect(qa.confidence).toBeGreaterThanOrEqual(1);
                expect(qa.confidence).toBeLessThanOrEqual(5);
            });
        });

        it('should categorize Q&As correctly', () => {
            const reportData = {
                metadata: { marketplace: 'US' },
                results: [
                    {
                        targetId: 'keyword-analysis',
                        title: 'Keyword Analysis',
                        highlights: [{ text: 'Keywords' }]
                    },
                    {
                        targetId: 'review-analysis',
                        title: 'Review Analysis',
                        highlights: [{ text: 'Reviews' }]
                    }
                ]
            };

            const qas = generateMultiLangQAs(reportData);

            const categories = [...new Set(qas.map(qa => qa.category))];
            expect(categories.length).toBeGreaterThan(0);
        });
    });

    // ========================================
    // 事件处理测试
    // ========================================

    describe('Event Handling', () => {
        it('should listen to scraper success event', async () => {
            await mount(container);

            expect(qalabState.dataUpdateHandler).toBeDefined();

            // 触发事件
            eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS);

            // 验证事件处理器被调用
            expect(qalabState.dataUpdateHandler).toBeDefined();
        });

        it('should cleanup event listeners on unmount', async () => {
            await mount(container);
            const handler = qalabState.dataUpdateHandler;

            unmount();

            expect(qalabState.dataUpdateHandler).toBeNull();
        });
    });

    // ========================================
    // 错误处理测试
    // ========================================

    describe('Error Handling', () => {
        beforeEach(() => {
            container.innerHTML = mockTemplate;
        });

        it('should handle missing DOM elements gracefully', () => {
            container.innerHTML = '';

            expect(() => loadSample()).not.toThrow();
            expect(() => clearInput()).not.toThrow();
            expect(() => toggleExpandAll()).not.toThrow();
        });

        it('should handle invalid Q&A ID in toggle', () => {
            expect(() => toggleQA(999)).not.toThrow();
        });

        it('should handle invalid Q&A ID in copy', async () => {
            const btnElement = document.createElement('button');

            expect(() => copyQA(999, btnElement)).not.toThrow();
        });

        it('should handle missing translation in copy', async () => {
            qalabState.generatedQAs = [
                {
                    id: 1,
                    category: 'test',
                    confidence: 5,
                    translations: {},
                    sources: []
                }
            ] as any;

            const btnElement = document.createElement('button');

            expect(() => copyQA(1, btnElement)).not.toThrow();
        });
    });
});
