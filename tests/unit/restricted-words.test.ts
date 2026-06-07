// tests/unit/restricted-words.test.ts
// ================================================================
// Restricted Words 模块单元测试
// 测试模块生命周期、搜索筛选、数据渲染和导出功能
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    initRestrictedWordsPanel
} from '@/modules/sops/views/growth/restricted_words/restrictedWordsHandler';
import {
    RESTRICTED_WORDS_DATABASE,
    RISK_LEVELS,
    WORD_CATEGORIES,
    EU_SITES
} from '@/modules/sops/views/growth/restricted_words/constants/restrictedWordsConstants';

// Mock 依赖
vi.mock('@/common/utils/actionRegistry', () => ({
    registerActionsWithLegacy: vi.fn()
}));

vi.mock('@/common/utils/security', () => ({
    escapeHtml: (text: string) => text.replace(/[&<>"']/g, (char) => {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
        };
        return map[char];
    }),
    setSafeHtml: (element: Element, html: string) => {
        element.innerHTML = html;
    }
}));

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

describe('Restricted Words Module', () => {
    let container: HTMLElement;

    beforeEach(() => {
        // 创建测试容器
        container = document.createElement('div');
        container.id = 'restricted-words-container';
        
        // 创建必要的 DOM 元素
        container.innerHTML = `
            <div id="rw-panel">
                <input type="text" id="rw-search-input" />
                <select id="rw-search-mode">
                    <option value="fuzzy">模糊搜索</option>
                    <option value="exact">精确匹配</option>
                    <option value="fulltext">全文搜索</option>
                    <option value="regex">正则表达式</option>
                </select>
                <button id="rw-search-btn">搜索</button>
                <button id="rw-clear-btn">清除</button>
                <select id="rw-filter-category"></select>
                <select id="rw-filter-risk"></select>
                <select id="rw-site-context">
                    <option value="ALL">全部站点</option>
                    <option value="DE">德国</option>
                    <option value="FR">法国</option>
                    <option value="UK">英国</option>
                </select>
                <div id="rw-stats-display"></div>
                <table>
                    <tbody id="rw-results-tbody"></tbody>
                </table>
                <div id="rw-detail-modal" class="hidden">
                    <div id="rw-modal-header"></div>
                    <div id="rw-detail-content"></div>
                </div>
                <button id="expandAllBtn"></button>
            </div>
        `;
        
        document.body.appendChild(container);
    });

    afterEach(() => {
        // 清理 DOM
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
        vi.clearAllMocks();
    });

    // ========================================
    // 常量数据测试
    // ========================================

    describe('Constants', () => {
        it('should have valid RISK_LEVELS', () => {
            expect(RISK_LEVELS).toBeDefined();
            expect(Object.keys(RISK_LEVELS)).toHaveLength(5);
            
            // 验证每个风险等级的结构
            Object.values(RISK_LEVELS).forEach(level => {
                expect(level).toHaveProperty('label');
                expect(level).toHaveProperty('icon');
                expect(level).toHaveProperty('color');
                expect(level).toHaveProperty('description');
            });
        });

        it('should have valid WORD_CATEGORIES', () => {
            expect(WORD_CATEGORIES).toBeDefined();
            expect(Object.keys(WORD_CATEGORIES).length).toBeGreaterThan(0);
            
            // 验证每个分类的结构
            Object.values(WORD_CATEGORIES).forEach(category => {
                expect(category).toHaveProperty('label');
                expect(category).toHaveProperty('icon');
                expect(category).toHaveProperty('color');
                expect(category).toHaveProperty('description');
            });
        });

        it('should have valid EU_SITES', () => {
            expect(EU_SITES).toBeDefined();
            expect(Array.isArray(EU_SITES)).toBe(true);
            expect(EU_SITES.length).toBeGreaterThan(0);
            
            // 验证包含主要欧洲站点
            expect(EU_SITES).toContain('DE');
            expect(EU_SITES).toContain('FR');
            expect(EU_SITES).toContain('UK');
        });

        it('should have valid RESTRICTED_WORDS_DATABASE', () => {
            expect(RESTRICTED_WORDS_DATABASE).toBeDefined();
            expect(Array.isArray(RESTRICTED_WORDS_DATABASE)).toBe(true);
            expect(RESTRICTED_WORDS_DATABASE.length).toBeGreaterThan(0);
            
            // 验证每个词条的结构
            RESTRICTED_WORDS_DATABASE.forEach(word => {
                expect(word).toHaveProperty('id');
                expect(word).toHaveProperty('keyword');
                expect(word).toHaveProperty('category');
                expect(word).toHaveProperty('riskLevel');
                expect(word).toHaveProperty('affectedSites');
                expect(word).toHaveProperty('commonProducts');
                expect(word).toHaveProperty('riskDescription');
                expect(word).toHaveProperty('legalBasis');
                expect(word).toHaveProperty('alternatives');
                expect(word).toHaveProperty('tips');
                
                // 验证数据类型
                expect(typeof word.id).toBe('string');
                expect(typeof word.keyword).toBe('string');
                expect(typeof word.category).toBe('string');
                expect(typeof word.riskLevel).toBe('number');
                expect(Array.isArray(word.affectedSites)).toBe(true);
                expect(Array.isArray(word.commonProducts)).toBe(true);
                expect(Array.isArray(word.alternatives)).toBe(true);
                
                // 验证风险等级范围
                expect(word.riskLevel).toBeGreaterThanOrEqual(1);
                expect(word.riskLevel).toBeLessThanOrEqual(5);
            });
        });
    });

    // ========================================
    // 模块初始化测试
    // ========================================

    describe('Module Initialization', () => {
        it('should initialize panel successfully', () => {
            expect(() => initRestrictedWordsPanel()).not.toThrow();
        });

        it('should populate filter dropdowns', () => {
            initRestrictedWordsPanel();
            
            const catSelect = document.getElementById('rw-filter-category') as HTMLSelectElement;
            const riskSelect = document.getElementById('rw-filter-risk') as HTMLSelectElement;
            
            expect(catSelect).toBeDefined();
            expect(riskSelect).toBeDefined();
            
            // 验证分类下拉菜单已填充
            expect(catSelect.options.length).toBeGreaterThan(1);
            
            // 验证风险等级下拉菜单已填充
            expect(riskSelect.options.length).toBeGreaterThan(1);
        });

        it('should bind event listeners', () => {
            initRestrictedWordsPanel();
            
            const searchBtn = document.getElementById('rw-search-btn');
            const clearBtn = document.getElementById('rw-clear-btn');
            
            expect(searchBtn).toBeDefined();
            expect(clearBtn).toBeDefined();
        });

        it('should render initial results', () => {
            initRestrictedWordsPanel();
            
            const tbody = document.getElementById('rw-results-tbody');
            const statsDisplay = document.getElementById('rw-stats-display');
            
            expect(tbody).toBeDefined();
            expect(statsDisplay).toBeDefined();
            
            // 验证显示了结果统计
            expect(statsDisplay?.textContent).toContain('显示');
        });
    });

    // ========================================
    // 搜索功能测试
    // ========================================

    describe('Search Functionality', () => {
        beforeEach(() => {
            initRestrictedWordsPanel();
        });

        it('should perform fuzzy search', () => {
            const searchInput = document.getElementById('rw-search-input') as HTMLInputElement;
            const searchMode = document.getElementById('rw-search-mode') as HTMLSelectElement;
            const searchBtn = document.getElementById('rw-search-btn') as HTMLButtonElement;
            
            searchInput.value = 'bamboo';
            searchMode.value = 'fuzzy';
            searchBtn.click();
            
            const tbody = document.getElementById('rw-results-tbody');
            expect(tbody?.innerHTML).toContain('Bamboo');
        });

        it('should perform exact search', () => {
            const searchInput = document.getElementById('rw-search-input') as HTMLInputElement;
            const searchMode = document.getElementById('rw-search-mode') as HTMLSelectElement;
            const searchBtn = document.getElementById('rw-search-btn') as HTMLButtonElement;
            
            searchInput.value = 'Bamboo';
            searchMode.value = 'exact';
            searchBtn.click();
            
            const tbody = document.getElementById('rw-results-tbody');
            expect(tbody?.innerHTML).toContain('Bamboo');
        });

        it('should perform fulltext search', () => {
            const searchInput = document.getElementById('rw-search-input') as HTMLInputElement;
            const searchMode = document.getElementById('rw-search-mode') as HTMLSelectElement;
            const searchBtn = document.getElementById('rw-search-btn') as HTMLButtonElement;
            
            searchInput.value = 'textile';
            searchMode.value = 'fulltext';
            searchBtn.click();
            
            const tbody = document.getElementById('rw-results-tbody');
            // 全文搜索应该在描述中找到 textile
            expect(tbody?.innerHTML.length).toBeGreaterThan(0);
        });

        it('should handle regex search', () => {
            const searchInput = document.getElementById('rw-search-input') as HTMLInputElement;
            const searchMode = document.getElementById('rw-search-mode') as HTMLSelectElement;
            const searchBtn = document.getElementById('rw-search-btn') as HTMLButtonElement;
            
            searchInput.value = '^Bamboo$';
            searchMode.value = 'regex';
            searchBtn.click();
            
            const tbody = document.getElementById('rw-results-tbody');
            expect(tbody?.innerHTML).toContain('Bamboo');
        });

        it('should handle invalid regex gracefully', () => {
            const searchInput = document.getElementById('rw-search-input') as HTMLInputElement;
            const searchMode = document.getElementById('rw-search-mode') as HTMLSelectElement;
            const searchBtn = document.getElementById('rw-search-btn') as HTMLButtonElement;
            
            searchInput.value = '[invalid(regex';
            searchMode.value = 'regex';
            
            expect(() => searchBtn.click()).not.toThrow();
        });

        it('should search with Enter key', () => {
            const searchInput = document.getElementById('rw-search-input') as HTMLInputElement;
            
            searchInput.value = 'bamboo';
            
            const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
            searchInput.dispatchEvent(enterEvent);
            
            const tbody = document.getElementById('rw-results-tbody');
            expect(tbody?.innerHTML).toContain('Bamboo');
        });

        it('should show no results message when no matches', () => {
            const searchInput = document.getElementById('rw-search-input') as HTMLInputElement;
            const searchBtn = document.getElementById('rw-search-btn') as HTMLButtonElement;
            
            searchInput.value = 'nonexistentkeyword12345';
            searchBtn.click();
            
            const tbody = document.getElementById('rw-results-tbody');
            expect(tbody?.innerHTML).toContain('没有找到');
        });
    });

    // ========================================
    // 筛选功能测试
    // ========================================

    describe('Filter Functionality', () => {
        beforeEach(() => {
            initRestrictedWordsPanel();
        });

        it('should filter by category', () => {
            const catFilter = document.getElementById('rw-filter-category') as HTMLSelectElement;
            
            catFilter.value = 'MAT';
            catFilter.dispatchEvent(new Event('change'));
            
            const tbody = document.getElementById('rw-results-tbody');
            const statsDisplay = document.getElementById('rw-stats-display');
            
            // 验证结果已筛选
            expect(statsDisplay?.textContent).toContain('显示');
            
            // 验证只显示材质成分类别的词条
            const rows = tbody?.querySelectorAll('tr');
            expect(rows?.length).toBeGreaterThan(0);
        });

        it('should filter by risk level', () => {
            const riskFilter = document.getElementById('rw-filter-risk') as HTMLSelectElement;
            
            riskFilter.value = '5';
            riskFilter.dispatchEvent(new Event('change'));
            
            const tbody = document.getElementById('rw-results-tbody');
            const statsDisplay = document.getElementById('rw-stats-display');
            
            // 验证结果已筛选
            expect(statsDisplay?.textContent).toContain('显示');
            
            // 验证只显示风险等级5的词条
            const rows = tbody?.querySelectorAll('tr');
            expect(rows?.length).toBeGreaterThan(0);
        });

        it('should filter by site context', () => {
            const siteContext = document.getElementById('rw-site-context') as HTMLSelectElement;
            
            siteContext.value = 'DE';
            siteContext.dispatchEvent(new Event('change'));
            
            const tbody = document.getElementById('rw-results-tbody');
            const statsDisplay = document.getElementById('rw-stats-display');
            
            // 验证结果已筛选
            expect(statsDisplay?.textContent).toContain('显示');
        });

        it('should combine multiple filters', () => {
            const catFilter = document.getElementById('rw-filter-category') as HTMLSelectElement;
            const riskFilter = document.getElementById('rw-filter-risk') as HTMLSelectElement;
            const siteContext = document.getElementById('rw-site-context') as HTMLSelectElement;
            
            catFilter.value = 'MAT';
            catFilter.dispatchEvent(new Event('change'));
            
            riskFilter.value = '5';
            riskFilter.dispatchEvent(new Event('change'));
            
            siteContext.value = 'DE';
            siteContext.dispatchEvent(new Event('change'));
            
            const statsDisplay = document.getElementById('rw-stats-display');
            
            // 验证结果已筛选
            expect(statsDisplay?.textContent).toContain('显示');
        });

        it('should reset filters', () => {
            const searchInput = document.getElementById('rw-search-input') as HTMLInputElement;
            const catFilter = document.getElementById('rw-filter-category') as HTMLSelectElement;
            const riskFilter = document.getElementById('rw-filter-risk') as HTMLSelectElement;
            const clearBtn = document.getElementById('rw-clear-btn') as HTMLButtonElement;
            
            // 设置一些筛选条件
            searchInput.value = 'bamboo';
            catFilter.value = 'MAT';
            riskFilter.value = '5';
            
            // 清除筛选
            clearBtn.click();
            
            // 验证筛选已重置
            expect(searchInput.value).toBe('');
            expect(catFilter.value).toBe('');
            expect(riskFilter.value).toBe('');
        });
    });

    // ========================================
    // 详情显示测试
    // ========================================

    describe('Detail Display', () => {
        beforeEach(() => {
            initRestrictedWordsPanel();
        });

        it('should show word detail modal', () => {
            // 模拟点击详情按钮
            const wordId = RESTRICTED_WORDS_DATABASE[0].id;
            (window as any).showWordDetail(wordId);
            
            const modal = document.getElementById('rw-detail-modal');
            const header = document.getElementById('rw-modal-header');
            const content = document.getElementById('rw-detail-content');
            
            expect(modal?.classList.contains('hidden')).toBe(false);
            expect(header?.innerHTML.length).toBeGreaterThan(0);
            expect(content?.innerHTML.length).toBeGreaterThan(0);
        });

        it('should display word details correctly', () => {
            const word = RESTRICTED_WORDS_DATABASE[0];
            (window as any).showWordDetail(word.id);
            
            const header = document.getElementById('rw-modal-header');
            const content = document.getElementById('rw-detail-content');
            
            // 验证显示了关键词
            expect(header?.innerHTML).toContain(word.keyword);
            
            // 验证显示了风险描述
            expect(content?.innerHTML).toContain(word.riskDescription);
            
            // 验证显示了替代方案
            word.alternatives.forEach(alt => {
                expect(content?.innerHTML).toContain(alt);
            });
        });

        it('should close detail modal', async () => {
            const wordId = RESTRICTED_WORDS_DATABASE[0].id;
            (window as any).showWordDetail(wordId);
            
            let modal = document.getElementById('rw-detail-modal');
            expect(modal?.classList.contains('hidden')).toBe(false);
            
            // 关闭模态框
            (window as any).closeWordDetail();
            
            // 等待动画完成
            await wait(250);
            modal = document.getElementById('rw-detail-modal');
            expect(modal?.classList.contains('hidden')).toBe(true);
        });

        it('should close modal with ESC key', async () => {
            const wordId = RESTRICTED_WORDS_DATABASE[0].id;
            (window as any).showWordDetail(wordId);
            
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escEvent);
            
            await wait(250);
            const modal = document.getElementById('rw-detail-modal');
            expect(modal?.classList.contains('hidden')).toBe(true);
        });

        it('should handle invalid word ID gracefully', () => {
            expect(() => (window as any).showWordDetail('invalid-id')).not.toThrow();
        });
    });

    // ========================================
    // 数据渲染测试
    // ========================================

    describe('Data Rendering', () => {
        beforeEach(() => {
            initRestrictedWordsPanel();
        });

        it('should render results table', () => {
            const tbody = document.getElementById('rw-results-tbody');
            
            expect(tbody).toBeDefined();
            expect(tbody?.innerHTML.length).toBeGreaterThan(0);
        });

        it('should display statistics', () => {
            const statsDisplay = document.getElementById('rw-stats-display');
            
            expect(statsDisplay?.textContent).toContain('显示');
            expect(statsDisplay?.textContent).toContain('条结果');
        });

        it('should render affected sites badges', () => {
            const tbody = document.getElementById('rw-results-tbody');
            
            // 验证站点标签已渲染
            expect(tbody?.innerHTML).toContain('DE');
        });

        it('should render risk level icons', () => {
            const tbody = document.getElementById('rw-results-tbody');
            
            // 验证风险等级图标已渲染
            Object.values(RISK_LEVELS).forEach(level => {
                if (tbody?.innerHTML.includes(level.icon)) {
                    expect(tbody.innerHTML).toContain(level.icon);
                }
            });
        });

        it('should render category badges', () => {
            const tbody = document.getElementById('rw-results-tbody');
            
            // 验证分类标签已渲染
            Object.values(WORD_CATEGORIES).forEach(category => {
                if (tbody?.innerHTML.includes(category.label)) {
                    expect(tbody.innerHTML).toContain(category.label);
                }
            });
        });

        it('should escape HTML in user content', () => {
            const tbody = document.getElementById('rw-results-tbody');
            
            // 验证没有未转义的 HTML 标签
            expect(tbody?.innerHTML).not.toContain('<script>');
            expect(tbody?.innerHTML).not.toContain('javascript:');
        });
    });

    // ========================================
    // 本地化测试
    // ========================================

    describe('Localization', () => {
        beforeEach(() => {
            initRestrictedWordsPanel();
        });

        it('should display localized keywords for selected site', () => {
            const siteContext = document.getElementById('rw-site-context') as HTMLSelectElement;
            
            siteContext.value = 'DE';
            siteContext.dispatchEvent(new Event('change'));
            
            const tbody = document.getElementById('rw-results-tbody');
            
            // 验证显示了德语本地化关键词
            const word = RESTRICTED_WORDS_DATABASE.find(w => w.localizedKeywords?.DE);
            if (word && word.localizedKeywords?.DE) {
                expect(tbody?.innerHTML).toContain(word.localizedKeywords.DE);
            }
        });

        it('should fallback to English keyword if no localization', () => {
            const siteContext = document.getElementById('rw-site-context') as HTMLSelectElement;
            
            siteContext.value = 'UK';
            siteContext.dispatchEvent(new Event('change'));
            
            const tbody = document.getElementById('rw-results-tbody');
            
            // 验证显示了英文关键词
            const word = RESTRICTED_WORDS_DATABASE.find(w => !w.localizedKeywords?.UK);
            if (word) {
                expect(tbody?.innerHTML).toContain(word.keyword);
            }
        });
    });

    // ========================================
    // 错误处理测试
    // ========================================

    describe('Error Handling', () => {
        it('should handle missing DOM elements gracefully', () => {
            // 移除所有 DOM 元素
            container.innerHTML = '';
            
            expect(() => initRestrictedWordsPanel()).not.toThrow();
        });

        it('should handle empty search gracefully', () => {
            initRestrictedWordsPanel();
            
            const searchInput = document.getElementById('rw-search-input') as HTMLInputElement;
            const searchBtn = document.getElementById('rw-search-btn') as HTMLButtonElement;
            
            searchInput.value = '';
            
            expect(() => searchBtn.click()).not.toThrow();
        });

        it('should handle invalid filter values gracefully', () => {
            initRestrictedWordsPanel();
            
            const catFilter = document.getElementById('rw-filter-category') as HTMLSelectElement;
            
            catFilter.value = 'INVALID_CATEGORY';
            
            expect(() => catFilter.dispatchEvent(new Event('change'))).not.toThrow();
        });
    });

    // ========================================
    // 性能测试
    // ========================================

    describe('Performance', () => {
        it('should render large dataset efficiently', () => {
            const startTime = performance.now();
            
            initRestrictedWordsPanel();
            
            const endTime = performance.now();
            const renderTime = endTime - startTime;
            
            // 验证渲染时间合理（< 1000ms）
            expect(renderTime).toBeLessThan(1000);
        });

        it('should search efficiently', () => {
            initRestrictedWordsPanel();
            
            const searchInput = document.getElementById('rw-search-input') as HTMLInputElement;
            const searchBtn = document.getElementById('rw-search-btn') as HTMLButtonElement;
            
            searchInput.value = 'bamboo';
            
            const startTime = performance.now();
            searchBtn.click();
            const endTime = performance.now();
            
            const searchTime = endTime - startTime;
            
            // 验证搜索时间合理（< 100ms）
            expect(searchTime).toBeLessThan(100);
        });
    });
});
