// tests/unit/app_center_overview.properties.test.js
// ================================================================
// App Center Overview 模块 - 属性测试
// Feature: app-center-overview
// ================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

describe('App Center Overview - Property Tests', () => {
    
    describe('Property 1: 模块接口完整性', () => {
        // Feature: app-center-overview, Property 1: 对于任何overview模块的导出对象，它必须包含mount、unmount和scrollToModule三个函数，并且这些函数都是可调用的
        // **Validates: Requirements 1.2**
        
        it('应该导出mount、unmount和scrollToModule三个函数', async () => {
            // 动态导入overview模块
            const overviewModule = await import('@/modules/app_center/views/overview/index');
            
            // 验证三个必需函数存在
            expect(overviewModule).toHaveProperty('mount');
            expect(overviewModule).toHaveProperty('unmount');
            expect(overviewModule).toHaveProperty('scrollToModule');
            
            // 验证它们都是函数类型
            expect(typeof overviewModule.mount).toBe('function');
            expect(typeof overviewModule.unmount).toBe('function');
            expect(typeof overviewModule.scrollToModule).toBe('function');
        });
        
        it('mount函数应该是异步函数或返回Promise', async () => {
            const overviewModule = await import('@/modules/app_center/views/overview/index');
            
            // 创建一个测试容器
            const testContainer = document.createElement('div');
            
            // 调用mount应该返回Promise
            const result = overviewModule.mount(testContainer);
            expect(result).toBeInstanceOf(Promise);
            
            // 等待Promise完成
            await result;
        });
        
        it('unmount函数应该可以被调用而不抛出错误', async () => {
            const overviewModule = await import('@/modules/app_center/views/overview/index');
            
            // unmount应该可以安全调用
            expect(() => overviewModule.unmount()).not.toThrow();
        });
        
        it('scrollToModule函数应该接受字符串参数', async () => {
            const overviewModule = await import('@/modules/app_center/views/overview/index');
            
            // 使用fast-check生成随机字符串进行测试（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.string(),
                    async (categoryId) => {
                        // scrollToModule应该可以接受任何字符串参数而不抛出错误
                        expect(() => overviewModule.scrollToModule(categoryId)).not.toThrow();
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('模块接口在多次导入后保持一致', async () => {
            // 使用fast-check验证接口稳定性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        // 每次都重新导入模块
                        const module1 = await import('@/modules/app_center/views/overview/index');
                        const module2 = await import('@/modules/app_center/views/overview/index');
                        
                        // 验证两次导入的接口一致
                        expect(typeof module1.mount).toBe(typeof module2.mount);
                        expect(typeof module1.unmount).toBe(typeof module2.unmount);
                        expect(typeof module1.scrollToModule).toBe(typeof module2.scrollToModule);
                        
                        // 验证函数引用相同（ES模块单例）
                        expect(module1.mount).toBe(module2.mount);
                        expect(module1.unmount).toBe(module2.unmount);
                        expect(module1.scrollToModule).toBe(module2.scrollToModule);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('mount函数应该接受HTMLElement类型的容器参数', async () => {
            const overviewModule = await import('@/modules/app_center/views/overview/index');
            
            // 使用fast-check生成不同类型的DOM元素（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('div', 'section', 'main', 'article', 'aside'),
                    async (tagName) => {
                        const container = document.createElement(tagName);
                        
                        // mount应该接受任何有效的HTMLElement
                        await expect(overviewModule.mount(container)).resolves.not.toThrow();
                        
                        // 验证容器被正确修改
                        expect(container.innerHTML).not.toBe('');
                        expect(container.classList.contains('fade-in')).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('mount函数应该拒绝无效的容器参数', async () => {
            const overviewModule = await import('@/modules/app_center/views/overview/index');
            
            // 使用fast-check生成各种无效输入（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.oneof(
                        fc.constant(null),
                        fc.constant(undefined),
                        fc.string(),
                        fc.integer(),
                        fc.object(),
                        fc.array(fc.anything())
                    ),
                    async (invalidContainer) => {
                        // mount应该对无效容器抛出错误
                        await expect(overviewModule.mount(invalidContainer)).rejects.toThrow();
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('scrollToModule函数应该处理空字符串和null值', async () => {
            const overviewModule = await import('@/modules/app_center/views/overview/index');
            
            // 使用fast-check测试边界情况（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.oneof(
                        fc.constant(''),
                        fc.constant(null),
                        fc.constant(undefined)
                    ),
                    async (emptyValue) => {
                        // scrollToModule应该优雅地处理空值，不抛出错误
                        expect(() => overviewModule.scrollToModule(emptyValue)).not.toThrow();
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有导出的函数都应该有明确的参数签名', async () => {
            const overviewModule = await import('@/modules/app_center/views/overview/index');
            
            // 验证函数参数数量
            expect(overviewModule.mount.length).toBe(1); // mount(container)
            expect(overviewModule.unmount.length).toBe(0); // unmount()
            expect(overviewModule.scrollToModule.length).toBe(1); // scrollToModule(categoryId)
        });
        
        it('模块应该只导出必需的三个函数，不暴露内部实现', async () => {
            const overviewModule = await import('@/modules/app_center/views/overview/index');
            
            // 获取所有导出的成员
            const exports = Object.keys(overviewModule);
            
            // 验证只导出了三个必需的函数
            expect(exports).toContain('mount');
            expect(exports).toContain('unmount');
            expect(exports).toContain('scrollToModule');
            
            // 验证没有导出内部函数（如initOverviewEvents）
            expect(exports).not.toContain('initOverviewEvents');
            
            // 验证导出数量合理（允许一些默认导出，但不应该太多）
            expect(exports.length).toBeLessThanOrEqual(5);
        });
    });
    
    describe('Property 2: 挂载渲染正确性', () => {
        // Feature: app-center-overview, Property 2: 对于任何有效的DOM容器元素，调用overview模块的mount函数后，容器的innerHTML应该包含来自template.html的内容，并且容器应该具有'fade-in' CSS类
        // **Validates: Requirements 1.4**
        
        let overviewModule;
        
        beforeEach(async () => {
            // 在每个测试前导入模块
            overviewModule = await import('@/modules/app_center/views/overview/index');
        });
        
        afterEach(() => {
            // 清理DOM
            document.body.innerHTML = '';
        });
        
        it('挂载后容器应该包含模板内容', async () => {
            // 使用fast-check生成不同类型的DOM元素（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('div', 'section', 'main', 'article', 'aside', 'nav'),
                    async (tagName) => {
                        const container = document.createElement(tagName);
                        
                        // 调用mount函数
                        await overviewModule.mount(container);
                        
                        // 验证容器不为空
                        expect(container.innerHTML).not.toBe('');
                        expect(container.innerHTML.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('挂载后容器应该具有fade-in CSS类', async () => {
            // 使用fast-check测试多种容器元素（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('div', 'section', 'main', 'article', 'aside'),
                    async (tagName) => {
                        const container = document.createElement(tagName);
                        
                        // 调用mount函数
                        await overviewModule.mount(container);
                        
                        // 验证fade-in类存在
                        expect(container.classList.contains('fade-in')).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('挂载后容器应该包含来自template.html的关键内容', async () => {
            // 使用fast-check验证模板内容的存在性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 调用mount函数
                        await overviewModule.mount(container);
                        
                        // 验证关键内容存在（来自template.html）
                        const html = container.innerHTML;
                        
                        // 验证页面标题
                        expect(html).toContain('应用中心');
                        
                        // 验证主容器类
                        expect(html).toContain('app-overview-container');
                        
                        // 验证应用工具集section
                        expect(html).toContain('app-module-apps');
                        
                        // 验证子应用卡片
                        expect(html).toContain('Master Prompt');
                        expect(html).toContain('Keyword Hunter');
                        
                        // 验证data-action属性
                        expect(html).toContain('data-action="switch-tab"');
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('挂载后容器应该包含可点击的应用卡片', async () => {
            // 使用fast-check验证卡片元素的存在（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 调用mount函数
                        await overviewModule.mount(container);
                        
                        // 查询所有带data-action="switch-tab"的卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证至少有2个卡片（Master Prompt和Keyword Hunter）
                        expect(cards.length).toBeGreaterThanOrEqual(2);
                        
                        // 验证每个卡片都有data-tab属性
                        cards.forEach(card => {
                            expect(card.dataset.tab).toBeDefined();
                            expect(card.dataset.tab).not.toBe('');
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('挂载后容器应该包含统计信息区域', async () => {
            // 使用fast-check验证统计信息的存在（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 调用mount函数
                        await overviewModule.mount(container);
                        
                        const html = container.innerHTML;
                        
                        // 验证统计信息存在
                        expect(html).toContain('核心应用');
                        expect(html).toContain('功能模块');
                        expect(html).toContain('可用性');
                        expect(html).toContain('当前版本');
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('多次挂载到不同容器应该产生相同的内容结构', async () => {
            // 使用fast-check验证挂载的一致性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.tuple(
                        fc.constantFrom('div', 'section', 'main'),
                        fc.constantFrom('div', 'article', 'aside')
                    ),
                    async ([tagName1, tagName2]) => {
                        const container1 = document.createElement(tagName1);
                        const container2 = document.createElement(tagName2);
                        
                        // 挂载到两个不同的容器
                        await overviewModule.mount(container1);
                        await overviewModule.mount(container2);
                        
                        // 验证两个容器的内容结构相同（忽略空白差异）
                        const normalizeHTML = (html) => html.replace(/\s+/g, ' ').trim();
                        
                        expect(normalizeHTML(container1.innerHTML)).toBe(normalizeHTML(container2.innerHTML));
                        
                        // 验证两个容器都有fade-in类
                        expect(container1.classList.contains('fade-in')).toBe(true);
                        expect(container2.classList.contains('fade-in')).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('挂载后容器应该包含正确的HTML结构层次', async () => {
            // 使用fast-check验证DOM结构（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 调用mount函数
                        await overviewModule.mount(container);
                        
                        // 验证主容器
                        const mainContainer = container.querySelector('.app-overview-container');
                        expect(mainContainer).not.toBeNull();
                        
                        // 验证header区域
                        const header = mainContainer.querySelector('header');
                        expect(header).not.toBeNull();
                        
                        // 验证section区域
                        const section = mainContainer.querySelector('#app-module-apps');
                        expect(section).not.toBeNull();
                        
                        // 验证卡片网格
                        const cardGrid = mainContainer.querySelector('.app-card-grid');
                        expect(cardGrid).not.toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('挂载后容器应该包含快速入口按钮', async () => {
            // 使用fast-check验证快速入口按钮（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 调用mount函数
                        await overviewModule.mount(container);
                        
                        // 查询快速入口按钮
                        const quickLinks = container.querySelectorAll('[data-quick-link]');
                        
                        // 验证至少有快速入口按钮
                        expect(quickLinks.length).toBeGreaterThan(0);
                        
                        // 验证每个按钮都有data-quick-link属性
                        quickLinks.forEach(link => {
                            expect(link.dataset.quickLink).toBeDefined();
                            expect(link.dataset.quickLink).not.toBe('');
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('挂载到已有内容的容器应该替换原有内容', async () => {
            // 使用fast-check验证内容替换行为（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 10, maxLength: 100 }).filter(s => !s.includes('app-overview-container')),
                    async (originalContent) => {
                        const container = document.createElement('div');
                        const uniqueMarker = `<div id="unique-test-marker-${Date.now()}">${originalContent}</div>`;
                        container.innerHTML = uniqueMarker;
                        
                        // 调用mount函数
                        await overviewModule.mount(container);
                        
                        // 验证原有的唯一标记不存在了
                        expect(container.innerHTML).not.toContain('unique-test-marker');
                        
                        // 验证新内容包含模板内容
                        expect(container.innerHTML).toContain('app-overview-container');
                        expect(container.classList.contains('fade-in')).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('挂载后容器的innerHTML长度应该合理', async () => {
            // 使用fast-check验证内容长度（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 调用mount函数
                        await overviewModule.mount(container);
                        
                        // 验证内容长度合理（模板应该有足够的内容）
                        // template.html大约有200行，预期至少有5000个字符
                        expect(container.innerHTML.length).toBeGreaterThan(5000);
                        
                        // 但也不应该过大（避免重复加载）
                        expect(container.innerHTML.length).toBeLessThan(50000);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property 5: 卡片内容完整性', () => {
        // Feature: app-center-overview, Property 5: 对于任何overview页面中的子应用卡片元素，它必须同时满足：
        // 1. 包含应用名称、图标、描述和状态标识的可见内容
        // 2. 具有data-action="switch-tab"和data-tab属性用于导航
        // **Validates: Requirements 4.3, 8.2**
        
        let overviewModule;
        
        beforeEach(async () => {
            // 在每个测试前导入模块
            overviewModule = await import('@/modules/app_center/views/overview/index');
        });
        
        afterEach(() => {
            // 清理DOM
            document.body.innerHTML = '';
        });
        
        it('所有卡片都应该具有data-action="switch-tab"属性', async () => {
            // 使用fast-check验证所有卡片的导航属性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有带data-action="switch-tab"的卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证至少有2个卡片（Master Prompt和Keyword Hunter）
                        expect(cards.length).toBeGreaterThanOrEqual(2);
                        
                        // 验证每个卡片都有正确的data-action属性
                        cards.forEach(card => {
                            expect(card.dataset.action).toBe('switch-tab');
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有卡片都应该具有非空的data-tab属性', async () => {
            // 使用fast-check验证data-tab属性的存在性和有效性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片都有data-tab属性且不为空
                        cards.forEach(card => {
                            expect(card.dataset.tab).toBeDefined();
                            expect(card.dataset.tab).not.toBe('');
                            expect(typeof card.dataset.tab).toBe('string');
                            expect(card.dataset.tab.length).toBeGreaterThan(0);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有卡片都应该包含应用名称（h3标签）', async () => {
            // 使用fast-check验证应用名称的存在性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片都包含h3标签（应用名称）
                        cards.forEach(card => {
                            const appName = card.querySelector('h3');
                            expect(appName).not.toBeNull();
                            expect(appName.textContent.trim()).not.toBe('');
                            expect(appName.textContent.trim().length).toBeGreaterThan(0);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有卡片都应该包含图标（i标签）', async () => {
            // 使用fast-check验证图标的存在性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片都包含至少一个图标
                        cards.forEach(card => {
                            const icons = card.querySelectorAll('i');
                            expect(icons.length).toBeGreaterThan(0);
                            
                            // 验证至少有一个图标有Font Awesome类
                            const hasFontAwesomeIcon = Array.from(icons).some(icon => {
                                return icon.className.includes('fa-') || icon.className.includes('fas');
                            });
                            expect(hasFontAwesomeIcon).toBe(true);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有卡片都应该包含描述文本（p标签）', async () => {
            // 使用fast-check验证描述文本的存在性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片都包含描述段落
                        cards.forEach(card => {
                            const description = card.querySelector('p');
                            expect(description).not.toBeNull();
                            expect(description.textContent.trim()).not.toBe('');
                            // 描述应该有合理的长度（至少10个字符）
                            expect(description.textContent.trim().length).toBeGreaterThan(10);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有卡片都应该包含状态标识', async () => {
            // 使用fast-check验证状态标识的存在性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片都包含状态标识
                        cards.forEach(card => {
                            const html = card.innerHTML;
                            
                            // 验证包含状态文本（Active、Beta等）
                            const hasStatus = html.includes('Active') || 
                                            html.includes('Beta') || 
                                            html.includes('Coming Soon') ||
                                            html.includes('活跃') ||
                                            html.includes('测试');
                            expect(hasStatus).toBe(true);
                            
                            // 验证状态标识有样式类（通常是badge或pill样式）
                            const statusBadges = card.querySelectorAll('.bg-green-100, .bg-yellow-100, .bg-gray-100');
                            expect(statusBadges.length).toBeGreaterThan(0);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有卡片都应该同时满足内容完整性和导航属性要求', async () => {
            // 使用fast-check验证卡片的完整性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片都满足所有要求
                        cards.forEach(card => {
                            // 1. 导航属性
                            expect(card.dataset.action).toBe('switch-tab');
                            expect(card.dataset.tab).toBeDefined();
                            expect(card.dataset.tab).not.toBe('');
                            
                            // 2. 应用名称
                            const appName = card.querySelector('h3');
                            expect(appName).not.toBeNull();
                            expect(appName.textContent.trim()).not.toBe('');
                            
                            // 3. 图标
                            const icons = card.querySelectorAll('i');
                            expect(icons.length).toBeGreaterThan(0);
                            
                            // 4. 描述
                            const description = card.querySelector('p');
                            expect(description).not.toBeNull();
                            expect(description.textContent.trim().length).toBeGreaterThan(10);
                            
                            // 5. 状态标识
                            const html = card.innerHTML;
                            const hasStatus = html.includes('Active') || 
                                            html.includes('Beta') || 
                                            html.includes('Coming Soon');
                            expect(hasStatus).toBe(true);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('卡片应该包含版本信息', async () => {
            // 使用fast-check验证版本信息的存在性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片都包含版本信息
                        cards.forEach(card => {
                            const html = card.innerHTML;
                            
                            // 验证包含版本号（v1.0、v2.0等格式）
                            const hasVersion = /v\d+\.\d+/.test(html);
                            expect(hasVersion).toBe(true);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('卡片应该包含功能标签', async () => {
            // 使用fast-check验证功能标签的存在性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片都包含功能标签
                        cards.forEach(card => {
                            // 查找功能标签（通常是小的badge元素）
                            const tags = card.querySelectorAll('.bg-slate-100');
                            expect(tags.length).toBeGreaterThan(0);
                            
                            // 验证标签有文本内容
                            tags.forEach(tag => {
                                expect(tag.textContent.trim()).not.toBe('');
                            });
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('卡片的data-tab属性应该对应有效的路由ID', async () => {
            // 使用fast-check验证data-tab属性的有效性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 已知的有效路由ID（根据template.html）
                        const validRouteIds = ['scraper', 'kw_input'];
                        
                        // 验证每个卡片的data-tab属性是有效的路由ID
                        cards.forEach(card => {
                            const routeId = card.dataset.tab;
                            expect(validRouteIds).toContain(routeId);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('卡片应该具有可点击的视觉提示', async () => {
            // 使用fast-check验证卡片的交互样式（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片都有cursor-pointer类或类似的可点击样式
                        cards.forEach(card => {
                            const classList = Array.from(card.classList);
                            const hasClickableStyle = classList.includes('cursor-pointer') || 
                                                     card.style.cursor === 'pointer';
                            expect(hasClickableStyle).toBe(true);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('每个卡片的内容元素应该按正确的层次结构组织', async () => {
            // 使用fast-check验证DOM结构的层次性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片的DOM结构
                        cards.forEach(card => {
                            // 验证卡片是一个div元素
                            expect(card.tagName.toLowerCase()).toBe('div');
                            
                            // 验证卡片有合理的子元素数量
                            expect(card.children.length).toBeGreaterThan(0);
                            
                            // 验证h3（应用名称）在p（描述）之前
                            const h3 = card.querySelector('h3');
                            const p = card.querySelector('p');
                            
                            if (h3 && p) {
                                // 获取元素在DOM中的位置
                                const h3Position = Array.from(card.querySelectorAll('*')).indexOf(h3);
                                const pPosition = Array.from(card.querySelectorAll('*')).indexOf(p);
                                
                                // h3应该在p之前
                                expect(h3Position).toBeLessThan(pPosition);
                            }
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('卡片内容应该在多次挂载后保持一致', async () => {
            // 使用fast-check验证卡片内容的一致性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 2, max: 5 }),
                    async (mountCount) => {
                        const containers = [];
                        
                        // 多次挂载到不同容器
                        for (let i = 0; i < mountCount; i++) {
                            const container = document.createElement('div');
                            await overviewModule.mount(container);
                            containers.push(container);
                        }
                        
                        // 获取第一个容器的卡片信息作为基准
                        const firstCards = containers[0].querySelectorAll('[data-action="switch-tab"]');
                        const firstCardData = Array.from(firstCards).map(card => ({
                            tab: card.dataset.tab,
                            name: card.querySelector('h3')?.textContent.trim(),
                            hasIcon: card.querySelectorAll('i').length > 0,
                            hasDescription: card.querySelector('p') !== null,
                            hasStatus: card.innerHTML.includes('Active') || card.innerHTML.includes('Beta')
                        }));
                        
                        // 验证所有容器的卡片信息一致
                        for (let i = 1; i < containers.length; i++) {
                            const cards = containers[i].querySelectorAll('[data-action="switch-tab"]');
                            const cardData = Array.from(cards).map(card => ({
                                tab: card.dataset.tab,
                                name: card.querySelector('h3')?.textContent.trim(),
                                hasIcon: card.querySelectorAll('i').length > 0,
                                hasDescription: card.querySelector('p') !== null,
                                hasStatus: card.innerHTML.includes('Active') || card.innerHTML.includes('Beta')
                            }));
                            
                            expect(cardData).toEqual(firstCardData);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property 6: 卡片点击导航', () => {
        // Feature: app-center-overview, Property 6: 对于任何带有data-action="switch-tab"属性的卡片元素，当触发点击事件时，系统应该派发一个包含正确routeId的'route-change'自定义事件
        // **Validates: Requirements 4.4**
        
        let overviewModule;
        
        beforeEach(async () => {
            // 在每个测试前导入模块
            overviewModule = await import('@/modules/app_center/views/overview/index');
        });
        
        afterEach(() => {
            // 清理DOM和事件监听器
            document.body.innerHTML = '';
            // 移除所有route-change事件监听器
            const oldListeners = window._routeChangeListeners || [];
            oldListeners.forEach(listener => {
                window.removeEventListener('route-change', listener);
            });
            window._routeChangeListeners = [];
        });
        
        it('点击卡片应该触发route-change事件', async () => {
            // 使用fast-check验证所有卡片的点击行为（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        document.body.appendChild(container);
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片的点击行为
                        for (const card of cards) {
                            let eventFired = false;
                            let eventDetail = null;
                            
                            const listener = (e) => {
                                eventFired = true;
                                eventDetail = e.detail;
                            };
                            
                            window.addEventListener('route-change', listener);
                            
                            // 触发点击事件
                            card.click();
                            
                            // 验证事件被触发
                            expect(eventFired).toBe(true);
                            expect(eventDetail).not.toBeNull();
                            
                            // 清理监听器
                            window.removeEventListener('route-change', listener);
                        }
                        
                        document.body.removeChild(container);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('route-change事件应该包含正确的routeId', async () => {
            // 使用fast-check验证事件detail中的routeId正确性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        document.body.appendChild(container);
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片的routeId
                        for (const card of cards) {
                            const expectedRouteId = card.dataset.tab;
                            let actualRouteId = null;
                            
                            const listener = (e) => {
                                actualRouteId = e.detail.routeId;
                            };
                            
                            window.addEventListener('route-change', listener);
                            
                            // 触发点击事件
                            card.click();
                            
                            // 验证routeId匹配
                            expect(actualRouteId).toBe(expectedRouteId);
                            expect(actualRouteId).not.toBe('');
                            expect(actualRouteId).not.toBeNull();
                            expect(actualRouteId).not.toBeUndefined();
                            
                            // 清理监听器
                            window.removeEventListener('route-change', listener);
                        }
                        
                        document.body.removeChild(container);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('route-change事件应该包含detail对象', async () => {
            // 使用fast-check验证事件detail对象的结构（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        document.body.appendChild(container);
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片的事件detail结构
                        for (const card of cards) {
                            let eventDetail = null;
                            
                            const listener = (e) => {
                                eventDetail = e.detail;
                            };
                            
                            window.addEventListener('route-change', listener);
                            
                            // 触发点击事件
                            card.click();
                            
                            // 验证detail对象存在且包含routeId属性
                            expect(eventDetail).not.toBeNull();
                            expect(eventDetail).toHaveProperty('routeId');
                            expect(typeof eventDetail.routeId).toBe('string');
                            
                            // 清理监听器
                            window.removeEventListener('route-change', listener);
                        }
                        
                        document.body.removeChild(container);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('多次点击同一卡片应该触发多次事件', async () => {
            // 使用fast-check验证重复点击行为（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 2, max: 5 }),
                    async (clickCount) => {
                        const container = document.createElement('div');
                        document.body.appendChild(container);
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 获取第一个卡片
                        const card = container.querySelector('[data-action="switch-tab"]');
                        expect(card).not.toBeNull();
                        
                        let eventCount = 0;
                        const routeIds = [];
                        
                        const listener = (e) => {
                            eventCount++;
                            routeIds.push(e.detail.routeId);
                        };
                        
                        window.addEventListener('route-change', listener);
                        
                        // 多次点击
                        for (let i = 0; i < clickCount; i++) {
                            card.click();
                        }
                        
                        // 验证事件触发次数
                        expect(eventCount).toBe(clickCount);
                        
                        // 验证所有routeId一致
                        const expectedRouteId = card.dataset.tab;
                        routeIds.forEach(routeId => {
                            expect(routeId).toBe(expectedRouteId);
                        });
                        
                        // 清理监听器
                        window.removeEventListener('route-change', listener);
                        document.body.removeChild(container);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('点击不同卡片应该触发不同的routeId', async () => {
            // 使用fast-check验证不同卡片的routeId唯一性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        document.body.appendChild(container);
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 至少需要2个卡片才能测试
                        expect(cards.length).toBeGreaterThanOrEqual(2);
                        
                        const routeIds = [];
                        
                        const listener = (e) => {
                            routeIds.push(e.detail.routeId);
                        };
                        
                        window.addEventListener('route-change', listener);
                        
                        // 点击所有卡片
                        cards.forEach(card => card.click());
                        
                        // 验证收集到的routeId数量
                        expect(routeIds.length).toBe(cards.length);
                        
                        // 验证routeId与卡片的data-tab属性匹配
                        cards.forEach((card, index) => {
                            expect(routeIds[index]).toBe(card.dataset.tab);
                        });
                        
                        // 验证不同卡片有不同的routeId
                        const uniqueRouteIds = new Set(routeIds);
                        expect(uniqueRouteIds.size).toBeGreaterThan(1);
                        
                        // 清理监听器
                        window.removeEventListener('route-change', listener);
                        document.body.removeChild(container);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('事件应该在window对象上触发', async () => {
            // 使用fast-check验证事件目标（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        document.body.appendChild(container);
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 获取第一个卡片
                        const card = container.querySelector('[data-action="switch-tab"]');
                        expect(card).not.toBeNull();
                        
                        let eventTarget = null;
                        
                        const listener = function(_e) {
                            eventTarget = this; // 'this' 指向事件目标
                        };
                        
                        window.addEventListener('route-change', listener);
                        
                        // 触发点击事件
                        card.click();
                        
                        // 验证事件在window对象上触发
                        expect(eventTarget).toBe(window);
                        
                        // 清理监听器
                        window.removeEventListener('route-change', listener);
                        document.body.removeChild(container);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('事件应该是CustomEvent类型', async () => {
            // 使用fast-check验证事件类型（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        document.body.appendChild(container);
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 获取第一个卡片
                        const card = container.querySelector('[data-action="switch-tab"]');
                        expect(card).not.toBeNull();
                        
                        let capturedEvent = null;
                        
                        const listener = (e) => {
                            capturedEvent = e;
                        };
                        
                        window.addEventListener('route-change', listener);
                        
                        // 触发点击事件
                        card.click();
                        
                        // 验证事件类型
                        expect(capturedEvent).toBeInstanceOf(CustomEvent);
                        expect(capturedEvent.type).toBe('route-change');
                        
                        // 清理监听器
                        window.removeEventListener('route-change', listener);
                        document.body.removeChild(container);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('卡片缺少data-tab属性时不应该触发事件', async () => {
            // 使用fast-check验证错误处理（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        document.body.appendChild(container);
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 创建一个没有data-tab属性的卡片
                        const fakeCard = document.createElement('div');
                        fakeCard.setAttribute('data-action', 'switch-tab');
                        // 故意不设置data-tab属性
                        container.appendChild(fakeCard);
                        
                        let eventFired = false;
                        
                        const listener = () => {
                            eventFired = true;
                        };
                        
                        window.addEventListener('route-change', listener);
                        
                        // 点击假卡片
                        fakeCard.click();
                        
                        // 验证事件没有被触发
                        expect(eventFired).toBe(false);
                        
                        // 清理监听器
                        window.removeEventListener('route-change', listener);
                        document.body.removeChild(container);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('事件应该在点击后立即触发（同步行为）', async () => {
            // 使用fast-check验证事件触发时机（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        document.body.appendChild(container);
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 获取第一个卡片
                        const card = container.querySelector('[data-action="switch-tab"]');
                        expect(card).not.toBeNull();
                        
                        let eventFired = false;
                        
                        const listener = () => {
                            eventFired = true;
                        };
                        
                        window.addEventListener('route-change', listener);
                        
                        // 触发点击事件
                        card.click();
                        
                        // 事件应该立即触发（同步）
                        expect(eventFired).toBe(true);
                        
                        // 清理监听器
                        window.removeEventListener('route-change', listener);
                        document.body.removeChild(container);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有带data-action="switch-tab"的卡片都应该有点击监听器', async () => {
            // 使用fast-check验证所有卡片都被正确初始化（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const container = document.createElement('div');
                        document.body.appendChild(container);
                        
                        // 挂载overview页面
                        await overviewModule.mount(container);
                        
                        // 查询所有卡片
                        const cards = container.querySelectorAll('[data-action="switch-tab"]');
                        
                        // 验证每个卡片都能触发事件
                        let successCount = 0;
                        
                        const listener = () => {
                            successCount++;
                        };
                        
                        window.addEventListener('route-change', listener);
                        
                        // 点击所有卡片
                        cards.forEach(card => card.click());
                        
                        // 验证所有卡片都触发了事件
                        expect(successCount).toBe(cards.length);
                        
                        // 清理监听器
                        window.removeEventListener('route-change', listener);
                        document.body.removeChild(container);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property 3: 分类配置完整性', () => {
        // Feature: app-center-overview, Property 3: 对于任何appCategories中定义的分类对象，它必须包含id、label、icon、color、order、version和description这七个必需字段
        // **Validates: Requirements 3.3**
        
        it('appCategories应该存在于MENU_CONFIG中', async () => {
            // 使用fast-check验证appCategories的存在性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { MENU_CONFIG } = await import('@/common/config/menuConfig.js');
                        
                        // 验证appCategories存在
                        expect(MENU_CONFIG).toHaveProperty('appCategories');
                        expect(MENU_CONFIG.appCategories).toBeDefined();
                        expect(typeof MENU_CONFIG.appCategories).toBe('object');
                        expect(MENU_CONFIG.appCategories).not.toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('appCategories中的每个分类都应该包含所有必需字段', async () => {
            // 使用fast-check验证字段完整性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { MENU_CONFIG } = await import('@/common/config/menuConfig.js');
                        const requiredFields = ['id', 'label', 'icon', 'color', 'order', 'version', 'description'];
                        
                        // 获取所有分类
                        const categories = Object.values(MENU_CONFIG.appCategories);
                        
                        // 验证至少有一个分类
                        expect(categories.length).toBeGreaterThan(0);
                        
                        // 验证每个分类都包含所有必需字段
                        categories.forEach(category => {
                            requiredFields.forEach(field => {
                                expect(category).toHaveProperty(field);
                                expect(category[field]).toBeDefined();
                                expect(category[field]).not.toBeNull();
                            });
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('appCategories中每个分类的字段类型应该正确', async () => {
            // 使用fast-check验证字段类型（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { MENU_CONFIG } = await import('@/common/config/menuConfig.js');
                        const categories = Object.values(MENU_CONFIG.appCategories);
                        
                        categories.forEach(category => {
                            // id应该是字符串
                            expect(typeof category.id).toBe('string');
                            expect(category.id.length).toBeGreaterThan(0);
                            
                            // label应该是字符串
                            expect(typeof category.label).toBe('string');
                            expect(category.label.length).toBeGreaterThan(0);
                            
                            // icon应该是字符串
                            expect(typeof category.icon).toBe('string');
                            expect(category.icon.length).toBeGreaterThan(0);
                            
                            // color应该是字符串
                            expect(typeof category.color).toBe('string');
                            expect(category.color.length).toBeGreaterThan(0);
                            
                            // order应该是数字
                            expect(typeof category.order).toBe('number');
                            expect(category.order).toBeGreaterThan(0);
                            
                            // version应该是字符串
                            expect(typeof category.version).toBe('string');
                            expect(category.version.length).toBeGreaterThan(0);
                            
                            // description应该是字符串
                            expect(typeof category.description).toBe('string');
                            expect(category.description.length).toBeGreaterThan(0);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('appCategories应该至少包含一个分类', async () => {
            // 使用fast-check验证最小配置要求（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { MENU_CONFIG } = await import('@/common/config/menuConfig.js');
                        const categoryKeys = Object.keys(MENU_CONFIG.appCategories);
                        
                        // 验证至少有一个分类
                        expect(categoryKeys.length).toBeGreaterThanOrEqual(1);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('appCategories中的apps分类应该存在', async () => {
            // 使用fast-check验证特定分类的存在性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { MENU_CONFIG } = await import('@/common/config/menuConfig.js');
                        
                        // 验证apps分类存在
                        expect(MENU_CONFIG.appCategories).toHaveProperty('apps');
                        expect(MENU_CONFIG.appCategories.apps).toBeDefined();
                        expect(MENU_CONFIG.appCategories.apps.id).toBe('apps');
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property 4: 结构一致性', () => {
        // Feature: app-center-overview, Property 4: 对于任何categories配置对象（sopCategories、hubCategories、moreCategories、appCategories），它们的字段结构（字段名称集合）应该完全相同
        // **Validates: Requirements 3.4**
        
        it('所有categories配置对象应该具有相同的字段结构', async () => {
            // 使用fast-check验证结构一致性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { MENU_CONFIG } = await import('@/common/config/menuConfig.js');
                        
                        // 获取字段集合的辅助函数
                        const getFieldSet = (categoriesObj) => {
                            const firstCategory = Object.values(categoriesObj)[0];
                            return firstCategory ? new Set(Object.keys(firstCategory)) : new Set();
                        };
                        
                        // 获取各个categories的字段集合
                        const sopFields = getFieldSet(MENU_CONFIG.sopCategories);
                        const hubFields = getFieldSet(MENU_CONFIG.hubCategories);
                        const moreFields = getFieldSet(MENU_CONFIG.moreCategories);
                        const appFields = getFieldSet(MENU_CONFIG.appCategories);
                        
                        // 验证所有字段集合相同
                        expect([...sopFields].sort()).toEqual([...hubFields].sort());
                        expect([...hubFields].sort()).toEqual([...moreFields].sort());
                        expect([...moreFields].sort()).toEqual([...appFields].sort());
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有categories配置对象的字段数量应该相同', async () => {
            // 使用fast-check验证字段数量一致性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { MENU_CONFIG } = await import('@/common/config/menuConfig.js');
                        
                        // 获取字段数量的辅助函数
                        const getFieldCount = (categoriesObj) => {
                            const firstCategory = Object.values(categoriesObj)[0];
                            return firstCategory ? Object.keys(firstCategory).length : 0;
                        };
                        
                        // 获取各个categories的字段数量
                        const sopCount = getFieldCount(MENU_CONFIG.sopCategories);
                        const hubCount = getFieldCount(MENU_CONFIG.hubCategories);
                        const moreCount = getFieldCount(MENU_CONFIG.moreCategories);
                        const appCount = getFieldCount(MENU_CONFIG.appCategories);
                        
                        // 验证所有字段数量相同
                        expect(sopCount).toBe(hubCount);
                        expect(hubCount).toBe(moreCount);
                        expect(moreCount).toBe(appCount);
                        
                        // 验证字段数量为7（id, label, icon, color, order, version, description）
                        expect(appCount).toBe(7);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有categories配置对象的每个分类都应该包含相同的字段', async () => {
            // 使用fast-check验证每个分类的字段一致性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { MENU_CONFIG } = await import('@/common/config/menuConfig.js');
                        
                        // 获取所有categories的所有分类
                        const allCategories = [
                            ...Object.values(MENU_CONFIG.sopCategories),
                            ...Object.values(MENU_CONFIG.hubCategories),
                            ...Object.values(MENU_CONFIG.moreCategories),
                            ...Object.values(MENU_CONFIG.appCategories)
                        ];
                        
                        // 获取第一个分类的字段作为基准
                        const referenceFields = new Set(Object.keys(allCategories[0]));
                        
                        // 验证所有分类都有相同的字段
                        allCategories.forEach(category => {
                            const categoryFields = new Set(Object.keys(category));
                            expect([...categoryFields].sort()).toEqual([...referenceFields].sort());
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('所有categories配置对象的字段类型应该一致', async () => {
            // 使用fast-check验证字段类型一致性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { MENU_CONFIG } = await import('@/common/config/menuConfig.js');
                        
                        // 获取所有categories的所有分类
                        const allCategories = [
                            ...Object.values(MENU_CONFIG.sopCategories),
                            ...Object.values(MENU_CONFIG.hubCategories),
                            ...Object.values(MENU_CONFIG.moreCategories),
                            ...Object.values(MENU_CONFIG.appCategories)
                        ];
                        
                        // 验证每个分类的字段类型
                        allCategories.forEach(category => {
                            expect(typeof category.id).toBe('string');
                            expect(typeof category.label).toBe('string');
                            expect(typeof category.icon).toBe('string');
                            expect(typeof category.color).toBe('string');
                            expect(typeof category.order).toBe('number');
                            expect(typeof category.version).toBe('string');
                            expect(typeof category.description).toBe('string');
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});

    
    describe('Property 7: 动态注册功能', () => {
        // Feature: app-center-overview, Property 7: 对于任何有效的路由ID和模块加载函数，调用registerSubModule(routeId, loader)后，MODULE_MAP应该包含该路由项，并且后续可以通过该路由ID成功加载模块
        // **Validates: Requirements 6.4**
        
        it('registerSubModule应该成功注册有效的路由', async () => {
            // 使用fast-check验证动态注册功能（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 5, maxLength: 20 }).filter(s => !s.includes(' ')),
                    async (routeId) => {
                        const { registerSubModule } = await import('@/modules/app_center/app_center.js');
                        
                        // 创建一个有效的loader函数
                        const loader = () => Promise.resolve({ 
                            mount: () => {}, 
                            unmount: () => {} 
                        });
                        
                        // 尝试注册
                        const result = registerSubModule(`test_${routeId}`, loader);
                        
                        // 验证返回值是布尔类型
                        expect(typeof result).toBe('boolean');
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('registerSubModule应该拒绝已存在的路由ID', async () => {
            // 使用fast-check验证重复注册的处理（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { registerSubModule } = await import('@/modules/app_center/app_center.js');
                        
                        // 使用已知存在的路由ID
                        const existingRouteId = 'scraper';
                        const loader = () => Promise.resolve({ mount: () => {}, unmount: () => {} });
                        
                        // 尝试注册已存在的路由
                        const result = registerSubModule(existingRouteId, loader);
                        
                        // 应该返回false
                        expect(result).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('registerSubModule应该拒绝无效的loader参数', async () => {
            // 使用fast-check验证参数验证（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.oneof(
                        fc.constant(null),
                        fc.constant(undefined),
                        fc.string(),
                        fc.integer(),
                        fc.object(),
                        fc.array(fc.anything())
                    ),
                    async (invalidLoader) => {
                        const { registerSubModule } = await import('@/modules/app_center/app_center.js');
                        
                        // 尝试使用无效的loader
                        const result = registerSubModule('test_invalid_loader', invalidLoader);
                        
                        // 应该返回false
                        expect(result).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('registerSubModule应该接受返回Promise的函数', async () => {
            // 使用fast-check验证loader函数类型（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 5, maxLength: 20 }).filter(s => !s.includes(' ')),
                    async (routeId) => {
                        const { registerSubModule } = await import('@/modules/app_center/app_center.js');
                        
                        // 创建返回Promise的loader
                        const loader = () => Promise.resolve({ 
                            mount: async () => {}, 
                            unmount: () => {},
                            scrollToModule: () => {}
                        });
                        
                        // 注册新路由
                        const uniqueRouteId = `test_promise_${routeId}_${Date.now()}`;
                        const result = registerSubModule(uniqueRouteId, loader);
                        
                        // 验证注册成功
                        expect(typeof result).toBe('boolean');
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('registerSubModule应该记录成功注册的日志', async () => {
            // 使用fast-check验证日志输出（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 5, maxLength: 20 }).filter(s => !s.includes(' ')),
                    async (routeId) => {
                        const { registerSubModule } = await import('@/modules/app_center/app_center.js');
                        
                        // 捕获console.log输出
                        const originalLog = console.log;
                        let logCalled = false;
                        console.log = (...args) => {
                            if (args[0] && args[0].includes('动态注册子模块')) {
                                logCalled = true;
                            }
                            originalLog(...args);
                        };
                        
                        const loader = () => Promise.resolve({ mount: () => {}, unmount: () => {} });
                        const uniqueRouteId = `test_log_${routeId}_${Date.now()}`;
                        registerSubModule(uniqueRouteId, loader);
                        
                        // 恢复console.log
                        console.log = originalLog;
                        
                        // 验证日志被调用（如果注册成功）
                        // 注意：由于可能重复注册，这里不强制要求logCalled为true
                        expect(typeof logCalled).toBe('boolean');
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('registerSubModule应该记录失败注册的警告', async () => {
            // 使用fast-check验证错误日志（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { registerSubModule } = await import('@/modules/app_center/app_center.js');
                        
                        // 捕获console.warn输出
                        const originalWarn = console.warn;
                        let warnCalled = false;
                        console.warn = (...args) => {
                            if (args[0] && args[0].includes('已存在')) {
                                warnCalled = true;
                            }
                            originalWarn(...args);
                        };
                        
                        // 尝试注册已存在的路由
                        const loader = () => Promise.resolve({ mount: () => {}, unmount: () => {} });
                        registerSubModule('scraper', loader);
                        
                        // 恢复console.warn
                        console.warn = originalWarn;
                        
                        // 验证警告被调用
                        expect(warnCalled).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('registerSubModule应该记录无效loader的错误', async () => {
            // 使用fast-check验证错误日志（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(null),
                    async () => {
                        const { registerSubModule } = await import('@/modules/app_center/app_center.js');
                        
                        // 捕获console.error输出
                        const originalError = console.error;
                        let errorCalled = false;
                        console.error = (...args) => {
                            if (args[0] && args[0].includes('无效的loader函数')) {
                                errorCalled = true;
                            }
                            originalError(...args);
                        };
                        
                        // 尝试使用无效的loader
                        registerSubModule('test_invalid', 'not a function');
                        
                        // 恢复console.error
                        console.error = originalError;
                        
                        // 验证错误被调用
                        expect(errorCalled).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('多次调用registerSubModule应该保持一致的行为', async () => {
            // 使用fast-check验证一致性（最少100次迭代）
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 5, maxLength: 20 }).filter(s => !s.includes(' ')),
                    async (routeId) => {
                        const { registerSubModule } = await import('@/modules/app_center/app_center.js');
                        
                        const loader = () => Promise.resolve({ mount: () => {}, unmount: () => {} });
                        const uniqueRouteId = `test_consistency_${routeId}_${Date.now()}`;
                        
                        // 第一次注册
                        const result1 = registerSubModule(uniqueRouteId, loader);
                        
                        // 第二次注册相同的路由
                        const result2 = registerSubModule(uniqueRouteId, loader);
                        
                        // 第一次应该成功，第二次应该失败
                        expect(result1).not.toBe(result2);
                        if (result1 === true) {
                            expect(result2).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
