import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// More - 智能体页面
export async function mount(container) {
    const html = await loadTemplate('src/modules/more/views/explore/agents/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');

    // 初始化鼠标跟踪效果
    initMouseTrackingEffect();

    console.log("✅ 智能体模块已挂载");
}

export function unmount() {
    // 清理事件监听器
    cleanupMouseTrackingEffect();
    console.log("❌ 智能体模块已卸载");
}

// 存储事件监听器引用，用于清理
let mouseTrackingHandlers = [];

/**
 * 初始化鼠标跟踪效果
 * 为每个智能体卡片添加鼠标移动监听，实现渐变跟随效果
 */
function initMouseTrackingEffect() {
    const cards = document.querySelectorAll('.agent-card');
    
    cards.forEach(card => {
        const gradient = card.querySelector('.agent-card-gradient');
        if (!gradient) return;

        const handleMouseMove = (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 计算相对位置百分比
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            
            // 更新 CSS 变量
            gradient.style.setProperty('--mouse-x', `${xPercent}%`);
            gradient.style.setProperty('--mouse-y', `${yPercent}%`);
        };

        const handleMouseLeave = () => {
            // 鼠标离开时重置为中心位置
            gradient.style.setProperty('--mouse-x', '50%');
            gradient.style.setProperty('--mouse-y', '50%');
        };

        // 添加事件监听器
        card.addEventListener('mousemove', handleMouseMove);
        card.addEventListener('mouseleave', handleMouseLeave);

        // 保存引用用于清理
        mouseTrackingHandlers.push({
            element: card,
            handlers: { mousemove: handleMouseMove, mouseleave: handleMouseLeave }
        });
    });
}

/**
 * 清理鼠标跟踪效果
 * 移除所有事件监听器
 */
function cleanupMouseTrackingEffect() {
    mouseTrackingHandlers.forEach(({ element, handlers }) => {
        element.removeEventListener('mousemove', handlers.mousemove);
        element.removeEventListener('mouseleave', handlers.mouseleave);
    });
    mouseTrackingHandlers = [];
}
