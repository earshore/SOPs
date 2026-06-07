/**
 * 邮件回复模板 SOP - 静态版
 * Email Reply Templates SOP - Static Version
 */

import BaseModule from '../../../../../common/BaseModule';
import { loadTemplate } from '../../../../../common/utils/viewLoader';

class EmailTemplatesModule extends BaseModule {
    private removeTemplateToggleListener: (() => void) | null = null;

    private bindTemplateToggles(container: HTMLElement): void {
        this.removeTemplateToggleListener?.();

        const handleToggleClick = (event: Event): void => {
            const target = event.target as HTMLElement | null;
            const toggle = target?.closest<HTMLElement>('[data-email-template-toggle]');
            if (!toggle || !container.contains(toggle)) return;

            toggle.nextElementSibling?.classList.toggle('hidden');
        };

        container.addEventListener('click', handleToggleClick);
        this.removeTemplateToggleListener = () => {
            container.removeEventListener('click', handleToggleClick);
            this.removeTemplateToggleListener = null;
        };
    }

    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/sops/views/service/email_templates/template.html');
        // ✅ 安全: html来自本地静态template.html，无用户输入
        container.innerHTML = html;
        container.classList.add('fade-in');
        this.bindTemplateToggles(container);
        console.log('✅ 邮件回复模板 SOP 模块已挂载');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        this.removeTemplateToggleListener?.();
        console.log('❌ 邮件回复模板 SOP 模块已卸载');
    }
}

// 导出模块实例
const emailTemplatesModule = new EmailTemplatesModule('email_templates');

export const mount = (container: HTMLElement) => emailTemplatesModule.mount(container);
export const unmount = () => emailTemplatesModule.unmount();
