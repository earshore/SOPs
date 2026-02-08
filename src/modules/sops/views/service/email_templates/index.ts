/**
 * 邮件回复模板 SOP - 10站点版
 * Email Reply Templates SOP - 10 Sites
 */

import BaseModule from '../../../../../common/BaseModule';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { TEMPLATE_CATEGORIES, getTemplateHtml } from './constant/email_templates.js';
import { escapeHtml } from '../../../../../common/utils/security';

type Language = 'en' | 'de' | 'fr' | 'it' | 'es' | 'nl' | 'se' | 'pl' | 'be' | 'ie';

const LANGUAGES: Language[] = ['en', 'de', 'fr', 'it', 'es', 'nl', 'se', 'pl', 'be', 'ie'];

class EmailTemplatesModule extends BaseModule {
    private currentLang: Language = 'en';

    /**
     * 渲染模板卡片
     */
    private renderTemplateCards(container: HTMLElement): void {
        const cardsContainer = container.querySelector('#template-cards-container');
        if (!cardsContainer) return;

        let cardsHtml = '';

        TEMPLATE_CATEGORIES.forEach(category => {
            const badgeHtml = category.badge
                ? `<span class="ml-auto text-xs bg-${category.color}-200 text-${category.color}-800 px-2 py-1 rounded">${category.badge}</span>`
                : '';

            // 生成所有语言的内容（隐藏非当前语言）
            let langContents = '';

            LANGUAGES.forEach(lang => {
                const isHidden = lang !== this.currentLang ? 'hidden' : '';
                const templateContent = getTemplateHtml(category.id, lang);
                // 🔒 P0修复: 转义模板内容防止XSS
                langContents += `<div class="lang-content lang-${lang} ${isHidden}"><div class="bg-slate-50 p-3 rounded text-xs font-mono leading-relaxed whitespace-pre-wrap template-text">${escapeHtml(templateContent)}</div></div>`;
            });

            cardsHtml += `
                <div class="border rounded-xl overflow-hidden template-card" data-template-id="${category.id}">
                    <div class="bg-${category.color}-50 px-4 py-3 flex items-center gap-2">
                        <i class="fas ${category.icon} text-${category.color}-500"></i>
                        <span class="font-bold text-slate-800">${category.name}</span>
                        ${badgeHtml}
                    </div>
                    <div class="p-4 bg-white relative">
                        <!-- 复制按钮 -->
                        <button class="copy-template-btn absolute top-2 right-2 px-3 py-1.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 -translate-x-4 translate-y-4"
                                data-template-id="${category.id}">
                            <i class="fas fa-copy"></i>
                            <span>复制</span>
                        </button>
                        ${langContents}
                    </div>
                </div>
            `;
        });

        // ✅ 安全: 静态HTML模板，无用户输入
        cardsContainer.innerHTML = cardsHtml;
    }

    /**
     * 初始化多语言模板切换器
     */
    private initLanguageSwitcher(container: HTMLElement): void {
        const langTabs = container.querySelector('#lang-tabs');
        if (!langTabs) return;

        const buttons = langTabs.querySelectorAll('.lang-tab-btn');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = (btn as HTMLElement).dataset.lang as Language || 'en';
                this.currentLang = lang;

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

    /**
     * 初始化复制按钮功能
     */
    private initCopyButtons(container: HTMLElement): void {
        container.addEventListener('click', async (e) => {
            const copyBtn = (e.target as HTMLElement).closest('.copy-template-btn') as HTMLElement;
            if (!copyBtn) return;

            const templateCard = copyBtn.closest('.template-card');
            if (!templateCard) return;

            // 获取当前语言的模板内容（纯文本）
            const visibleContent = templateCard.querySelector('.lang-content:not(.hidden) .template-text') as HTMLElement;
            if (!visibleContent) return;

            // 获取纯文本（移除HTML标签）
            const textContent = visibleContent.innerText || visibleContent.textContent || '';

            try {
                await navigator.clipboard.writeText(textContent.trim());

                // 显示复制成功反馈
                const originalHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i><span>已复制!</span>';
                copyBtn.classList.remove('bg-slate-100', 'text-slate-600');
                copyBtn.classList.add('bg-green-100', 'text-green-600');

                // 2秒后恢复原样
                setTimeout(() => {
                    copyBtn.innerHTML = originalHtml;
                    copyBtn.classList.remove('bg-green-100', 'text-green-600');
                    copyBtn.classList.add('bg-slate-100', 'text-slate-600');
                }, 2000);

            } catch (err) {
                console.error('复制失败:', err);
                // 显示失败提示
                const originalHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-times"></i><span>失败</span>';
                copyBtn.classList.remove('bg-slate-100', 'text-slate-600');
                copyBtn.classList.add('bg-red-100', 'text-red-600');

                setTimeout(() => {
                    copyBtn.innerHTML = originalHtml;
                    copyBtn.classList.remove('bg-red-100', 'text-red-600');
                    copyBtn.classList.add('bg-slate-100', 'text-slate-600');
                }, 2000);
            }
        });
    }

    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/sops/views/service/email_templates/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;
        container.classList.add('fade-in');

        // 渲染模板卡片
        this.renderTemplateCards(container);

        // 初始化语言切换功能
        this.initLanguageSwitcher(container);

        // 初始化复制功能
        this.initCopyButtons(container);

        console.log('✅ 邮件回复模板 SOP 模块已挂载（10站点版）');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        console.log('❌ 邮件回复模板 SOP 模块已卸载');
    }
}

// 导出模块实例
const emailTemplatesModule = new EmailTemplatesModule('email_templates');

export const mount = (container: HTMLElement) => emailTemplatesModule.mount(container);
export const unmount = () => emailTemplatesModule.unmount();
