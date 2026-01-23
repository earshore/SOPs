
export function mount(container) {
    container.innerHTML = `
        <div class="p-6">
            <h2 class="text-xl font-bold mb-4">SOP 流程中心</h2>
            <div class="p-4 bg-blue-50 text-blue-700 rounded-lg">
                <i class="fas fa-info-circle mr-2"></i>
                该模块正在建设中...
            </div>
        </div>
    `;
}

export function unmount() {
    // 清理逻辑
}
