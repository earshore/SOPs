import { loadTemplate } from "../../../../common/utils/viewLoader";
import { APP_EVENTS } from "../../../../common/constants/eventConstants";

// App Center Overview - 总览页面
export async function mount(container) {
    const html = await loadTemplate('src/modules/app_center/views/overview/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');

    // 初始化事件监听
    initOverviewEvents(container);

    console.log("✅ App Center 总览模块已挂载");
}

export function unmount() {
    console.log("❌ App Center 总览模块已卸载");
}

function initOverviewEvents(container) {
    // 分类筛选按钮事件
    const filterBtns = container.querySelectorAll('.category-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有按钮的 active 状态
            filterBtns.forEach(b => {
                b.classList.remove('active', 'bg-blue-500', 'text-white');
                b.classList.add('bg-white', 'text-slate-700', 'border-slate-300');
            });
            
            // 添加当前按钮的 active 状态
            btn.classList.add('active', 'bg-blue-500', 'text-white');
            btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-300');
            
            // 执行筛选
            const category = btn.dataset.category;
            filterByCategory(container, category);
        });
    });

    // 快速链接按钮事件
    const quickLinks = container.querySelectorAll('[data-quick-link]');
    quickLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetTab = link.dataset.quickLink;
            if (targetTab) {
                window.dispatchEvent(new CustomEvent(APP_EVENTS.ROUTE_CHANGE, {
                    detail: { routeId: targetTab }
                }));
            }
        });
    });

    // 应用卡片点击事件
    const appCards = container.querySelectorAll('[data-action="switch-tab"]');
    appCards.forEach(card => {
        card.addEventListener('click', () => {
            const targetTab = card.dataset.tab;
            if (targetTab) {
                window.dispatchEvent(new CustomEvent(APP_EVENTS.ROUTE_CHANGE, {
                    detail: { routeId: targetTab }
                }));
            }
        });
    });
}

/**
 * 按分类筛选应用卡片
 */
function filterByCategory(container, category) {
    // 获取所有应用卡片（不是 section）
    const cards = container.querySelectorAll('.app-center-card-grid > div[data-category]');
    
    cards.forEach(card => {
        if (category === 'all') {
            card.style.display = '';
            card.classList.add('fade-in');
        } else {
            if (card.dataset.category === category) {
                card.style.display = '';
                card.classList.add('fade-in');
            } else {
                card.style.display = 'none';
            }
        }
    });
    
    // 检查是否有可见的卡片，如果没有则隐藏整个 section
    const section = container.querySelector('#app-module-apps');
    if (section) {
        const visibleCards = section.querySelectorAll('.app-center-card-grid > div[data-category]:not([style*="display: none"])');
        if (visibleCards.length === 0 && category !== 'all') {
            section.style.display = 'none';
        } else {
            section.style.display = '';
        }
    }
}
