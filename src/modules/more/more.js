// src/modules/more/more.js
// More Module - 更多功能模块

console.log("🚀 More Module 开始加载...");

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
    switch (routeId) {
        case 'more_settings':
            // 直接打开设置面板
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('open-settings'));
            }, 100);
            break;
            
        case 'more_guide':
            // 打开用户指南
            setTimeout(() => {
                const modal = document.getElementById('user-guide-modal');
                if (modal && modal.open) {
                    modal.open();
                }
            }, 100);
            break;
            
        case 'more_tips':
            // 显示提示信息
            if (window.showToast) {
                window.showToast("提示功能正在开发中，敬请期待！", "info");
            }
            break;
            
        default:
            console.log(`📍 More Module: 显示默认探索页面`);
            break;
    }
}

console.log("✅ More Module 加载完成");