/**
 * More 模块 - 智能体页面
 * 展示可用的智能体列表和详情
 */

import BaseModule from '../../../../../common/BaseModule';
import { loadTemplate } from '../../../../../common/utils/viewLoader';

import { Logger } from '../../../../../services/loggerService';
// 存储事件监听器引用，用于清理
interface MouseTrackingHandler {
    element: HTMLElement;
    handlers: {
        mousemove: (e: MouseEvent) => void;
        mouseleave: () => void;
    };
}

let mouseTrackingHandlers: MouseTrackingHandler[] = [];

/**
 * 初始化鼠标跟踪效果
 * 为每个智能体卡片添加鼠标移动监听，实现渐变跟随效果
 */
function initMouseTrackingEffect(): void {
    const cards = document.querySelectorAll('.agent-card');

    cards.forEach((card) => {
        const gradient = card.querySelector('.agent-card-gradient') as HTMLElement;
        if (!gradient) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = (card as HTMLElement).getBoundingClientRect();
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
        (card as HTMLElement).addEventListener('mousemove', handleMouseMove);
        (card as HTMLElement).addEventListener('mouseleave', handleMouseLeave);

        // 保存引用用于清理
        mouseTrackingHandlers.push({
            element: card as HTMLElement,
            handlers: { mousemove: handleMouseMove, mouseleave: handleMouseLeave },
        });
    });
}

/**
 * 清理鼠标跟踪效果
 * 移除所有事件监听器
 */
function cleanupMouseTrackingEffect(): void {
    mouseTrackingHandlers.forEach(({ element, handlers }) => {
        element.removeEventListener('mousemove', handlers.mousemove);
        element.removeEventListener('mouseleave', handlers.mouseleave);
    });
    mouseTrackingHandlers = [];
}

// Module class
class AgentsModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/more/views/explore/agents/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;
        container.classList.add('fade-in');

        // 初始化鼠标跟踪效果
        initMouseTrackingEffect();

        Logger.debug('✅ 智能体模块已挂载');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        // 清理事件监听器
        cleanupMouseTrackingEffect();
        Logger.debug('❌ 智能体模块已卸载');
    }
}

// 导出模块实例
const agentsModule = new AgentsModule('more_agents');

export const mount = (container: HTMLElement) => agentsModule.mount(container);
export const unmount = () => agentsModule.unmount();
