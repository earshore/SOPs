import { loadTemplate } from "../../../../common/utils/viewLoader";
import { safeMount } from "../../../../common/utils/safeMount";
import { setSafeHtml } from "../../../../common/utils/security";

// SOPs Overview - 总览页面
const mountInternal = async (container: HTMLElement): Promise<void> => {
    const html = await loadTemplate('src/modules/sops/views/overview/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
    container.classList.add('fade-in');

    // 初始化事件监听
    initOverviewEvents(container);
};

export const mount = safeMount(mountInternal, { moduleName: 'SOPs Overview' });

export function unmount(): void {
    console.log("❌ SOPs 总览模块已卸载");
}

/**
 * 滚动到指定的模块区域
 * @param categoryId - 分类 ID (growth, backend, safety, service)
 */
export function scrollToModule(categoryId: string): void {
    const moduleId = `sop-module-${categoryId}`;
    const moduleElement = document.getElementById(moduleId);
    
    if (moduleElement) {
        // 使用平滑滚动
        moduleElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
        
        // 添加高亮效果
        moduleElement.classList.add('sop-module-highlight');
        setTimeout(() => {
            moduleElement.classList.remove('sop-module-highlight');
        }, 2000);
        
        console.log(`✅ 滚动到模块: ${categoryId}`);
    } else {
        console.warn(`⚠️ 未找到模块: ${moduleId}`);
    }
}

function initOverviewEvents(container: HTMLElement): void {
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
            const category = (btn as HTMLElement).dataset.category;
            if (category) {
                filterByCategory(container, category);
            }
        });
    });

    // 分类筛选标签点击事件
    const categoryTabs = container.querySelectorAll('.sop-category-tab');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有active状态
            categoryTabs.forEach(t => t.classList.remove('active'));
            // 添加当前active状态
            tab.classList.add('active');
            // 这里可以添加筛选逻辑
            const category = (tab as HTMLElement).dataset.category;
            if (category) {
                filterSOPs(container, category);
            }
        });
    });

    // 搜索框事件
    const searchInput = container.querySelector('#sop-search-input') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchSOPs(container, (e.target as HTMLInputElement).value);
        });
    }
}

function filterByCategory(container: HTMLElement, category: string): void {
    const sections = container.querySelectorAll('section[data-category]');
    
    sections.forEach(section => {
        const sectionElement = section as HTMLElement;
        if (category === 'all') {
            sectionElement.style.display = '';
            sectionElement.classList.add('fade-in');
        } else {
            if (sectionElement.dataset.category === category) {
                sectionElement.style.display = '';
                sectionElement.classList.add('fade-in');
            } else {
                sectionElement.style.display = 'none';
            }
        }
    });
}

function filterSOPs(container: HTMLElement, category: string): void {
    const cards = container.querySelectorAll('.sop-card');
    cards.forEach(card => {
        const cardElement = card as HTMLElement;
        if (category === 'all' || cardElement.dataset.category === category) {
            cardElement.style.display = 'block';
            cardElement.classList.add('sop-fade-in');
        } else {
            cardElement.style.display = 'none';
        }
    });
}

function searchSOPs(container: HTMLElement, keyword: string): void {
    const cards = container.querySelectorAll('.sop-card');
    const lowerKeyword = keyword.toLowerCase();
    cards.forEach(card => {
        const cardElement = card as HTMLElement;
        const title = cardElement.querySelector('h3')?.textContent?.toLowerCase() || '';
        const desc = cardElement.querySelector('p')?.textContent?.toLowerCase() || '';
        if (title.includes(lowerKeyword) || desc.includes(lowerKeyword)) {
            cardElement.style.display = 'block';
        } else {
            cardElement.style.display = 'none';
        }
    });
}
