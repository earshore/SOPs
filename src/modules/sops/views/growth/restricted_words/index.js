import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// 欧洲本土化高危词库 (Restricted Words) SOP
import { initRestrictedWordsPanel } from './restrictedWordsHandler.js';

export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/growth/restricted_words/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');

    // 初始化词库面板功能
    initRestrictedWordsPanel();

    console.log("✅ 欧洲本土化高危词库 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 欧洲本土化高危词库 SOP 模块已卸载");
}
