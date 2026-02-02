/**
 * menuConfig.js - v3.0 Enterprise Edition
 * 采用 Context -> Module -> Route 三层架构
 */

export const MENU_CONFIG = {
    // ==========================================
    // Tier 1: Contexts (顶层导航上下文)
    // 作用：决定 Header 哪个按钮高亮
    // ==========================================
    contexts: {
        sops: { id: 'sops', label: 'SOPs 流程中心' },
        apps: { id: 'apps', label: '应用中心' },
        hub: { id: 'hub', label: 'Amazon 智库' },
        more: { id: 'more', label: '更多' },
        sys: { id: 'sys', label: '系统设置' }
    },

    // ==========================================
    // Tier 2: Modules (业务模块/子应用实体)
    // 作用：决定侧边栏 (Sidebar) 显示什么标题和哪些菜单
    // ==========================================
    modules: {
        // [应用 SOPs] 标准作业程序
        sops: {
            id: 'sops',
            contextId: 'sops',
            title: 'SOPs 流程中心',
            version: 'v1.0',
            icon: 'fas fa-clipboard-list',
            description: '集成所有亚马逊运营标准化流程指引，确保团队执行一致性。'
        },

        // [应用 A] Master Prompt
        master_prompt: {
            id: 'master_prompt',
            contextId: 'apps',         // 归属于 "应用"
            title: 'Master Prompt',    // 侧边栏大标题
            version: 'v2.1 Pro',       // 侧边栏底部版本
            icon: 'fas fa-cubes-stacked', // 侧边栏底部图标
            // ✅ 新增描述字段
            description: '集成数据采集、管理、AI分析与提示词工程的一站式解决方案。'
        },

        // Keyword Tracker 模块配置
        keyword_tracker: {
            id: 'keyword_tracker',
            contextId: 'apps',
            title: 'Keyword Hunter',
            version: 'v1.0 Pro',
            icon: 'fas fa-search',
            // ✅ 新增描述字段
            description: 'ASIN 关键词覆盖情况查询，手动补充与 SEO 合规性审查工具。'
        },

        // [智库] Knowledge Base
        amz_hub_core: {
            id: 'amz_hub_core',
            contextId: 'hub',          // 归属于 "智库"
            title: 'Amazon 智库',
            version: 'KB v1.0',
            icon: 'fas fa-book-open',
            // ✅ 新增描述字段
            description: '亚马逊市场洞察报告、SEO策略、A10 算法知识库、营销日历与旺季攻略。'
        },

        // [更多] More Core Module
        more_core: {
            id: 'more_core',
            contextId: 'more',
            title: '更多',
            version: 'v1.0',
            icon: 'fas fa-compass',
            description: '探索更多实用功能和工具，提升工作效率。'
        }
    },

    // ==========================================
    // SOP Categories (用于SOPs模块的侧边栏分组)
    // ==========================================
    sopCategories: {
        growth: {
            id: 'growth',
            label: '运营与推广体系',
            icon: 'fas fa-rocket',
            color: 'emerald',
            order: 1,
            version: 'v2.0',
            description: '从新品上架到爆款打造的全链路运营推广策略集合。'
        },
        backend: {
            id: 'backend',
            label: '供应链与物流体系',
            icon: 'fas fa-warehouse',
            color: 'amber',
            order: 2,
            version: 'v1.5',
            description: '构建高效供应链，优化库存周转与物流成本。'
        },
        safety: {
            id: 'safety',
            label: '账号安全与风控体系',
            icon: 'fas fa-shield-halved',
            color: 'red',
            order: 3,
            version: 'v3.0',
            description: '全方位账号健康监控与风险防御机制。'
        },
        service: {
            id: 'service',
            label: '客服与客户体验体系',
            icon: 'fas fa-headset',
            color: 'blue',
            order: 4,
            version: 'v1.2',
            description: '提升客户满意度，打造极致的品牌服务体验。'
        }
    },

    // ==========================================
    // Hub Categories (用于Amazon智库模块的侧边栏分组)
    // ==========================================
    hubCategories: {
        knowledge: {
            id: 'knowledge',
            label: 'Amazon知识早知道',
            icon: 'fas fa-lightbulb',
            color: 'blue',
            order: 1,
            version: 'v1.0',
            description: '深入了解Amazon市场洞察、SEO策略与A10算法核心知识。'
        },
        practice: {
            id: 'practice',
            label: '入门实操宝典',
            icon: 'fas fa-hands',
            color: 'emerald',
            order: 2,
            version: 'v1.0',
            description: '从零开始的实战指南，掌握营销日历与促销工具使用技巧。'
        },
        advanced: {
            id: 'advanced',
            label: '运营提升全攻略',
            icon: 'fas fa-chart-line',
            color: 'purple',
            order: 3,
            version: 'v1.0',
            description: '进阶运营策略，提升转化率与销售表现的系统方法论。'
        }
    },

    // ==========================================
    // More Categories (用于More模块的侧边栏分组)
    // ==========================================
    moreCategories: {
        explore: {
            id: 'explore',
            label: '探索',
            icon: 'fas fa-compass',
            color: 'green',
            order: 1,
            version: 'v1.0',
            description: '智能体、提示词、工作流等实用功能。'
        }
    },

    // ==========================================
    // Tier 3: Routes (具体页面路由)
    // 作用：定义点击行为、图标、目标 Panel
    // ==========================================
    routes: {
        // --- 属于 SOPs 应用的页面 ---
        sops_overview: {
            moduleId: 'sops',
            label: 'SOP 总览',
            icon: 'fas fa-th-large',
            panelId: 'panel-sops'
        },

        // === 第一模块：运营与推广体系 (The Growth Layer) ===
        sops_npi_tracker: {
            moduleId: 'sops',
            label: '新品生命周期跟踪',
            icon: 'fas fa-seedling',
            panelId: 'panel-sops',
            category: 'growth'
        },
        sops_listing_seo: {
            moduleId: 'sops',
            label: 'Listing 极致优化 (SEO)',
            icon: 'fas fa-magnifying-glass-chart',
            panelId: 'panel-sops',
            category: 'growth'
        },
        sops_ppc_advertising: {
            moduleId: 'sops',
            label: 'PPC 广告投放与优化',
            icon: 'fas fa-chart-line',
            panelId: 'panel-sops',
            category: 'growth'
        },
        sops_restricted_words: {
            moduleId: 'sops',
            label: '欧洲本土化高危词库',
            icon: 'fas fa-book-dead',
            panelId: 'panel-sops',
            category: 'growth'
        },
        sops_promotion_submission: {
            moduleId: 'sops',
            label: '促销活动提报',
            icon: 'fas fa-tags',
            panelId: 'panel-sops',
            category: 'growth'
        },
        sops_competitor_monitoring: {
            moduleId: 'sops',
            label: '竞品监控与分析',
            icon: 'fas fa-binoculars',
            panelId: 'panel-sops',
            category: 'growth'
        },

        // === 第二模块：供应链与物流体系 (The Backend Layer) ===
        sops_fba_shipping: {
            moduleId: 'sops',
            label: 'FBA 发货标准操作',
            icon: 'fas fa-truck-fast',
            panelId: 'panel-sops',
            category: 'backend'
        },
        sops_procurement_qc: {
            moduleId: 'sops',
            label: '采购与质检 (QC)',
            icon: 'fas fa-clipboard-check',
            panelId: 'panel-sops',
            category: 'backend'
        },
        sops_inventory_replenishment: {
            moduleId: 'sops',
            label: '库存预警与补货',
            icon: 'fas fa-cubes',
            panelId: 'panel-sops',
            category: 'backend'
        },

        // === 第三模块：账号安全与风控体系 (The Safety Layer) ===
        sops_account_security: {
            moduleId: 'sops',
            label: '账号登录与环境安全',
            icon: 'fas fa-shield-halved',
            panelId: 'panel-sops',
            category: 'safety'
        },
        sops_permission_management: {
            moduleId: 'sops',
            label: '后台权限管理',
            icon: 'fas fa-user-lock',
            panelId: 'panel-sops',
            category: 'safety'
        },
        sops_brand_infringement: {
            moduleId: 'sops',
            label: '品牌与侵权审核',
            icon: 'fas fa-trademark',
            panelId: 'panel-sops',
            category: 'safety'
        },
        sops_performance_notification: {
            moduleId: 'sops',
            label: '绩效通知处理',
            icon: 'fas fa-bell',
            panelId: 'panel-sops',
            category: 'safety'
        },
        sops_product_compliance: {
            moduleId: 'sops',
            label: '敏感产品合规销售',
            icon: 'fas fa-file-shield',
            panelId: 'panel-sops',
            category: 'safety'
        },


        // === 第四模块：客服与客户体验体系 (The Service Layer) ===
        sops_email_templates: {
            moduleId: 'sops',
            label: '邮件回复模板',
            icon: 'fas fa-envelope-open-text',
            panelId: 'panel-sops',
            category: 'service'
        },
        sops_negative_review: {
            moduleId: 'sops',
            label: '差评处理与分析',
            icon: 'fas fa-comment-dots',
            panelId: 'panel-sops',
            category: 'service'
        },
        sops_qa_maintenance: {
            moduleId: 'sops',
            label: 'QA 问答维护',
            icon: 'fas fa-comments',
            panelId: 'panel-sops',
            category: 'service'
        },

        // --- 属于 Master Prompt 应用的页面 ---
        scraper: {
            moduleId: 'master_prompt', // 关键：绑定到模块 A
            label: '数据采集',
            icon: 'fas fa-spider',
            panelId: 'panel-scraper'
        },
        data: {
            moduleId: 'master_prompt',
            label: '数据管理',
            icon: 'fas fa-database',
            panelId: 'panel-data'
        },
        analysis: {
            moduleId: 'master_prompt',
            label: 'AI 分析',
            icon: 'fas fa-chart-pie',
            panelId: 'panel-analysis'
        },
        promptlab: {
            moduleId: 'master_prompt',
            label: 'Prompt 生成',
            icon: 'fas fa-wand-magic-sparkles',
            panelId: 'panel-promptlab'
        },

        // --- 属于 Keyword Tracker 应用的页面 (拓展示例) ---
        kw_input: {
            moduleId: 'keyword_tracker',
            label: '输入模块',
            icon: 'fas fa-keyboard',
            panelId: 'panel-keyword_tracker'
        },
        kw_process: {
            moduleId: 'keyword_tracker',
            label: '处理模块',
            icon: 'fas fa-cogs',
            panelId: 'panel-keyword_tracker'
        },
        kw_analysis: {
            moduleId: 'keyword_tracker',
            label: '分析统计',
            icon: 'fas fa-chart-pie',
            panelId: 'panel-keyword_tracker'
        },

        // --- 属于 Hub 智库的页面 ---

        // 总览页面
        amz_hub_overview: {
            moduleId: 'amz_hub_core',
            label: '智库总览',
            icon: 'fas fa-th-large',
            panelId: 'panel-amz_hub'
        },

        // === Amazon知识早知道 ===
        amz_eu_insights: {
            moduleId: 'amz_hub_core',
            label: '市场洞察',
            icon: 'fas fa-globe-europe',
            panelId: 'panel-amz_hub',
            category: 'knowledge'
        },
        amz_seo_strategy: {
            moduleId: 'amz_hub_core',
            label: 'SEO 策略',
            icon: 'fas fa-magnifying-glass-chart',
            panelId: 'panel-amz_hub',
            category: 'knowledge'
        },
        amz_ecosystem: {
            moduleId: 'amz_hub_core',
            label: 'A10 & COSMO',
            icon: 'fas fa-network-wired',
            panelId: 'panel-amz_hub',
            category: 'knowledge'
        },

        // === 入门实操宝典 ===
        amz_quality_listing: {
            moduleId: 'amz_hub_core',
            label: '教你打造优质Listing',
            icon: 'fas fa-star',
            panelId: 'panel-amz_hub',
            category: 'practice'
        },
        amz_marketing_calendar: {
            moduleId: 'amz_hub_core',
            label: 'EU营销日历',
            icon: 'fas fa-calendar-alt',
            panelId: 'panel-amz_hub',
            category: 'practice'
        },
        amz_seasons_tools: {
            moduleId: 'amz_hub_core',
            label: '销售活动/促销工具',
            icon: 'fa-solid fa-gift',
            panelId: 'panel-amz_hub',
            category: 'practice'
        },

        // === 运营提升全攻略 ===
        amz_conversion_optimization: {
            moduleId: 'amz_hub_core',
            label: '链接转化率低自查优化',
            icon: 'fas fa-chart-line',
            panelId: 'panel-amz_hub',
            category: 'advanced'
        },

        // --- 属于 More 模块的页面 ---
        more_overview: {
            moduleId: 'more_core',
            label: '更多总览',
            icon: 'fas fa-th-large',
            panelId: 'panel-more'
        },

        // === 探索体系 (The Explore Layer) ===
        more_agents: {
            moduleId: 'more_core',
            label: '智能体',
            icon: 'fas fa-robot',
            panelId: 'panel-more',
            category: 'explore'
        },
        more_prompts: {
            moduleId: 'more_core',
            label: '提示词',
            icon: 'fas fa-message',
            panelId: 'panel-more',
            category: 'explore'
        },
        more_workflows: {
            moduleId: 'more_core',
            label: '工作流',
            icon: 'fas fa-diagram-project',
            panelId: 'panel-more',
            category: 'explore'
        }

    }
};

// ================= Helpers =================

// 获取某模块下的所有路由 (用于生成侧边栏)
export function getRoutesByModule(moduleId) {
    return Object.entries(MENU_CONFIG.routes)
        .filter(([_, config]) => config.moduleId === moduleId)
        .map(([id, config]) => ({ id, ...config }));
}

// 获取路由的完整配置链 (Route -> Module -> Context)
export function getRouteFullConfig(routeId) {
    const route = MENU_CONFIG.routes[routeId];
    if (!route) return null;

    const module = MENU_CONFIG.modules[route.moduleId];
    const context = MENU_CONFIG.contexts[module.contextId];

    return {
        route,
        module,
        context
    };
}

// ================================================================
// 🎯 P2 增强: 模块自注册机制
// ================================================================

import { validateRouteConfig, validateModuleConfig } from '../utils/typeGuards.js';

/**
 * 动态注册路由（带类型校验）
 * 允许模块在运行时注册自己的路由，无需修改此文件
 * 
 * @param {string} routeId - 路由 ID
 * @param {Object} config - 路由配置
 * @returns {boolean} 是否注册成功
 * 
 * @example
 * registerRoute('sops_new_feature', {
 *   moduleId: 'sops',
 *   label: '新功能',
 *   icon: 'fas fa-star',
 *   panelId: 'panel-sops',
 *   category: 'growth'
 * });
 */
export function registerRoute(routeId, config) {
    // 运行时类型校验
    try {
        validateRouteConfig(config);
    } catch (error) {
        console.error(`[MenuConfig] 路由注册失败 "${routeId}":`, error.message);
        return false;
    }

    if (MENU_CONFIG.routes[routeId]) {
        console.warn(`[MenuConfig] 路由 "${routeId}" 已存在，跳过注册`);
        return false;
    }

    MENU_CONFIG.routes[routeId] = config;
    console.log(`✅ [MenuConfig] 动态注册路由: ${routeId}`);
    return true;
}

/**
 * 动态注册模块（带类型校验）
 * @param {string} moduleId - 模块 ID
 * @param {Object} config - 模块配置
 * @returns {boolean} 是否注册成功
 */
export function registerModule(moduleId, config) {
    // 运行时类型校验
    try {
        validateModuleConfig({
            id: moduleId,
            ...config
        });
    } catch (error) {
        console.error(`[MenuConfig] 模块注册失败 "${moduleId}":`, error.message);
        return false;
    }

    if (MENU_CONFIG.modules[moduleId]) {
        console.warn(`[MenuConfig] 模块 "${moduleId}" 已存在，跳过注册`);
        return false;
    }

    MENU_CONFIG.modules[moduleId] = {
        id: moduleId,
        ...config
    };
    console.log(`✅ [MenuConfig] 动态注册模块: ${moduleId}`);
    return true;
}

/**
 * 获取所有已注册的路由 ID
 * @returns {string[]}
 */
export function getAllRouteIds() {
    return Object.keys(MENU_CONFIG.routes);
}