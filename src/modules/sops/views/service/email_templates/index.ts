/**
 * 邮件回复模板 SOP - 静态版
 * Email Reply Templates SOP - Static Version
 */

import BaseModule from '../../../../../common/BaseModule';
import { loadTemplate } from '../../../../../common/utils/viewLoader';

import { Logger } from '../../../../../services/loggerService';
class EmailTemplatesModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/sops/views/service/email_templates/template.html');
        container.innerHTML = html;
        container.classList.add('fade-in');
        Logger.debug('✅ 邮件回复模板 SOP 模块已挂载');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        Logger.debug('❌ 邮件回复模板 SOP 模块已卸载');
    }
}

// 导出模块实例
const emailTemplatesModule = new EmailTemplatesModule('email_templates');

export const mount = (container: HTMLElement) => emailTemplatesModule.mount(container);
export const unmount = () => emailTemplatesModule.unmount();
