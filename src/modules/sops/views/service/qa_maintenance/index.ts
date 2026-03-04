import { loadTemplate } from "../../../../../common/utils/viewLoader";

import { Logger } from '../../../../../services/loggerService';
// QA 问答维护 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/service/qa_maintenance/template.html');
    // ✅ 安全: html来自静态模板文件，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    Logger.debug("✅ QA 问答维护 SOP 模块已挂载");
}

export function unmount(): void {
    Logger.debug("❌ QA 问答维护 SOP 模块已卸载");
}
