import { loadTemplate } from "../../../../common/utils/viewLoader.js";

// SOPs Overview - 总览页面
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/overview/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');

    // 初始化事件监听
    initOverviewEvents(container);

    console.log("✅ SOPs 总览模块已挂载");
}

export function unmount() {
    console.log("❌ SOPs 总览模块已卸载");
}

function initOverviewEvents(container) {
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
