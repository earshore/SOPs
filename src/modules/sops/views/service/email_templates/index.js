import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// 邮件回复模板 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/service/email_templates/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');

    // 初始化语言切换功能
    initLanguageSwitcher(container);

    console.log("✅ 邮件回复模板 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 邮件回复模板 SOP 模块已卸载");
}

/**
 * 初始化多语言模板切换器
 */
function initLanguageSwitcher(container) {
    const langTabs = container.querySelector('#lang-tabs');
    if (!langTabs) return;

    const buttons = langTabs.querySelectorAll('button');

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 从按钮的onclick属性中提取语言代码，或使用data属性
            const lang = btn.textContent.includes('UK') ? 'en' :
                btn.textContent.includes('DE') ? 'de' :
                    btn.textContent.includes('FR') ? 'fr' :
                        btn.textContent.includes('IT') ? 'it' :
                            btn.textContent.includes('ES') ? 'es' : 'en';

            // 隐藏所有语言内容
            container.querySelectorAll('.lang-content').forEach(el => el.classList.add('hidden'));

            // 显示选中的语言
            container.querySelectorAll('.lang-' + lang).forEach(el => el.classList.remove('hidden'));

            // 更新按钮样式
            buttons.forEach(b => {
                b.classList.remove('bg-slate-800', 'text-white');
                b.classList.add('bg-slate-100', 'text-slate-700');
            });
            btn.classList.remove('bg-slate-100', 'text-slate-700');
            btn.classList.add('bg-slate-800', 'text-white');
        });
    });
}
