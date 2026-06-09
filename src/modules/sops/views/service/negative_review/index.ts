import { loadTemplate } from "../../../../../common/utils/viewLoader";
import { setSafeHtml } from "../../../../../common/utils/security";

// 差评处理与分析 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/service/negative_review/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
    container.classList.add('fade-in');
}

export function unmount(): void {
}
