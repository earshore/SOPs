import { loadTemplate } from "../../../../../common/utils/viewLoader";

import { Logger } from '../../../../../services/loggerService';
// 绩效通知处理 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/safety/performance_notification/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    Logger.debug("✅ 绩效通知处理 SOP 模块已挂载");
}

export function unmount(): void {
    Logger.debug("❌ 绩效通知处理 SOP 模块已卸载");
}
