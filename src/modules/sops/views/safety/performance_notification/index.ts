import { loadTemplate } from "../../../../../common/utils/viewLoader";
import { setSafeHtml } from "../../../../../common/utils/security";

// 绩效通知处理 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/safety/performance_notification/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
    container.classList.add('fade-in');
}

export function unmount(): void {
}
