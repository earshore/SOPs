// src/modules/more/views/agents/index.js
// 智能体页面

console.log("🤖 智能体页面加载...");

export function initAgentsView() {
    console.log("✅ 智能体页面初始化完成");
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgentsView);
} else {
    initAgentsView();
}
