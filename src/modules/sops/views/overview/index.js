import { loadTemplate } from "../../../../common/utils/viewLoader.js";

// SOPs Overview - 总览页面
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/overview/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');

    // 初始化事件监听
    initOverviewEvents(container);

    console.log("✅ SOPs 总览模块已挂载");
}

export function unmount() {
    console.log("❌ SOPs 总览模块已卸载");
}

/**
 * 滚动到指定的模块区域
 * @param {string} categoryId - 分类 ID (growth, backend, safety, service)
 */
export function scrollToModule(categoryId) {
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

    // 分类筛选标签点击事件
    const categoryTabs = container.querySelectorAll('.sop-category-tab');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有active状态
            categoryTabs.forEach(t => t.classList.remove('active'));
            // 添加当前active状态
            tab.classList.add('active');
            // 这里可以添加筛选逻辑
            const category = tab.dataset.category;
            filterSOPs(container, category);
        });
    });

    // 搜索框事件
    const searchInput = container.querySelector('#sop-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchSOPs(container, e.target.value);
        });
    }
}

function filterByCategory(container, category) {
    const sections = container.querySelectorAll('section[data-category]');
    
    sections.forEach(section => {
        if (category === 'all') {
            section.style.display = '';
            section.classList.add('fade-in');
        } else {
            if (section.dataset.category === category) {
                section.style.display = '';
                section.classList.add('fade-in');
            } else {
                section.style.display = 'none';
            }
        }
    });
}

function filterSOPs(container, category) {
    const cards = container.querySelectorAll('.sop-card');
    cards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'block';
            card.classList.add('sop-fade-in');
        } else {
            card.style.display = 'none';
        }
    });
}

function searchSOPs(container, keyword) {
    const cards = container.querySelectorAll('.sop-card');
    const lowerKeyword = keyword.toLowerCase();
    cards.forEach(card => {
        const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('p')?.textContent.toLowerCase() || '';
        if (title.includes(lowerKeyword) || desc.includes(lowerKeyword)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}
