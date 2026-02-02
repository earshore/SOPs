// src/modules/more/views/workflows/index.js
// 工作流页面

console.log("⚙️ 工作流页面加载...");

export function initWorkflowsView() {
    console.log("✅ 工作流页面初始化完成");
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWorkflowsView);
} else {
    initWorkflowsView();
}
