// src/modules/more/views/overview/index.js
// 更多总览页面

console.log("🧭 更多总览页面加载...");

export async function mount(container) {
    try {
        // 加载HTML模板
        const response = await fetch('/src/modules/more/views/overview/template.html');
        if (!response.ok) throw new Error('加载模板失败');
        
        const html = await response.text();
        container.innerHTML = html;
        
        console.log("✅ 更多总览页面挂载完成");
    } catch (error) {
        console.error("❌ 更多总览页面挂载失败:", error);
        container.innerHTML = `
            <div class="p-10 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>页面加载失败</p>
            </div>
        `;
    }
}

export function unmount() {
    console.log("🧹 更多总览页面卸载");
}

/**
 * 滚动到指定的模块区域
 * @param {string} categoryId - 分类 ID (explore)
 */
export function scrollToModule(categoryId) {
    const moduleId = `more-module-${categoryId}`;
    const moduleElement = document.getElementById(moduleId);
    
    if (moduleElement) {
        // 使用平滑滚动
        moduleElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
        
        // 添加高亮效果
        moduleElement.classList.add('more-module-highlight');
        setTimeout(() => {
            moduleElement.classList.remove('more-module-highlight');
        }, 2000);
        
        console.log(`✅ 滚动到模块: ${categoryId}`);
    } else {
        console.warn(`⚠️ 未找到模块: ${moduleId}`);
    }
}
