/**
 * 欧洲本土化高危词库 (Restricted Words) SOP
 * EU Localized Restricted Words Database SOP
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { cleanupRestrictedWordsPanel, initRestrictedWordsPanel } from './restrictedWordsHandler';

class RestrictedWordsModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/sops/views/growth/restricted_words/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        setSafeHtml(container, html);
        container.classList.add('fade-in');

        // 初始化词库面板功能
        initRestrictedWordsPanel();

        console.log('✅ 欧洲本土化高危词库 SOP 模块已挂载');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        cleanupRestrictedWordsPanel();
        console.log('❌ 欧洲本土化高危词库 SOP 模块已卸载');
    }
}

// 导出模块实例
const restrictedWordsModule = new RestrictedWordsModule('restricted_words');

export const mount = (container: HTMLElement) => restrictedWordsModule.mount(container);
export const unmount = () => restrictedWordsModule.unmount();
