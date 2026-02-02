// src/modules/more/views/prompts/index.js
// 提示词页面

console.log("💬 提示词页面加载...");

export function initPromptsView() {
    console.log("✅ 提示词页面初始化完成");
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromptsView);
} else {
    initPromptsView();
}
