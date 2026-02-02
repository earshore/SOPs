// src/modules/more/more.js
// More Module - 更多功能模块

console.log("🚀 More Module 开始加载...");

// 存储默认的探索页面HTML
let defaultExploreHTML = '';

// 监听路由变化事件
window.addEventListener('app:route-changed', (event) => {
    const { routeId, moduleId } = event.detail;
    
    // 只处理属于 more 模块的路由
    if (moduleId === 'more_explore') {
        console.log(`📍 More Module: 处理路由 ${routeId}`);
        handleMoreRoute(routeId);
    }
});

/**
 * 处理更多模块的路由切换
 * @param {string} routeId - 路由ID
 */
function handleMoreRoute(routeId) {
    const contentArea = document.getElementById('more_content_area');
    if (!contentArea) return;

    // 保存默认页面HTML（首次加载时）
    if (!defaultExploreHTML && routeId !== 'explore_agents' && routeId !== 'explore_prompts' && routeId !== 'explore_workflows') {
        defaultExploreHTML = contentArea.innerHTML;
    }

    switch (routeId) {
        // 探索功能的子页面
        case 'explore_agents':
            loadExploreView('agents');
            break;
            
        case 'explore_prompts':
            loadExploreView('prompts');
            break;
            
        case 'explore_workflows':
            loadExploreView('workflows');
            break;
            
        default:
            console.log(`📍 More Module: 显示默认探索页面`);
            // 恢复默认探索页面
            if (defaultExploreHTML) {
                contentArea.innerHTML = defaultExploreHTML;
                // 重新绑定事件
                bindCardEvents();
            }
            break;
    }
}

/**
 * 加载探索功能的子页面
 * @param {string} viewName - 视图名称 (agents/prompts/workflows)
 */
async function loadExploreView(viewName) {
    const contentArea = document.getElementById('more_content_area');
    if (!contentArea) return;

    try {
        // 动态加载HTML模板
        const response = await fetch(`/src/modules/more/views/${viewName}/template.html`);
        if (!response.ok) throw new Error(`加载 ${viewName} 模板失败`);
        
        const html = await response.text();
        contentArea.innerHTML = html;
        
        // 动态加载并初始化JS模块
        try {
            const module = await import(`./views/${viewName}/index.js`);
            if (module && module[`init${capitalize(viewName)}View`]) {
                module[`init${capitalize(viewName)}View`]();
            }
        } catch (jsError) {
            console.warn(`⚠️ ${viewName} JS模块加载失败，仅显示HTML:`, jsError);
        }
        
        console.log(`✅ ${viewName} 视图加载完成`);
    } catch (error) {
        console.error(`❌ 加载 ${viewName} 视图失败:`, error);
        contentArea.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                    <p class="text-slate-600">加载页面失败，请稍后重试</p>
                </div>
            </div>
        `;
    }
}

/**
 * 首字母大写
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 绑定卡片点击事件
 */
function bindCardEvents() {
    const morePanel = document.getElementById('panel-more');
    if (!morePanel) return;

    // 移除旧的监听器，使用事件委托
    const cards = morePanel.querySelectorAll('[data-route]');
    cards.forEach(card => {
        card.addEventListener('click', handleCardClick);
    });
}

/**
 * 处理卡片点击
 */
function handleCardClick(e) {
    const card = e.currentTarget;
    const routeId = card.dataset.route;
    
    if (!routeId) return;
    
    console.log(`🔗 点击卡片，导航到: ${routeId}`);
    
    // 触发路由导航
    if (window.switchTab) {
        window.switchTab(routeId, true);
    } else {
        console.error('❌ switchTab 函数未找到');
    }
}

// 初始化点击事件监听
document.addEventListener('DOMContentLoaded', () => {
    bindCardEvents();
});

// 如果DOM已经加载完成，立即绑定
if (document.readyState !== 'loading') {
    bindCardEvents();
}

console.log("✅ More Module 加载完成");