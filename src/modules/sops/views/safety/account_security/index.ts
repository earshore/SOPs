import { loadTemplate } from "../../../../../common/utils/viewLoader";

import { Logger } from '../../../../../services/loggerService';
// 账号登录与环境安全 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/safety/account_security/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    Logger.debug("✅ 账号登录与环境安全 SOP 模块已挂载");
}

export function unmount(): void {
    Logger.debug("❌ 账号登录与环境安全 SOP 模块已卸载");
}
