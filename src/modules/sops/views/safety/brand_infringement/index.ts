import { loadTemplate } from "../../../../../common/utils/viewLoader";
import { setSafeHtml } from "../../../../../common/utils/security";

// 品牌与侵权审核 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/safety/brand_infringement/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
    container.classList.add('fade-in');
}

export function unmount(): void {
}
